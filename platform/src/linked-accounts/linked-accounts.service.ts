import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';
import { ConnectorRegistry } from '../connectors/connector.registry';
import { SecretsService } from '../core/secrets/secrets.service';
import { SECRETS_SERVICE } from '../core/secrets/secrets.module';
import { Credentials } from '../connectors/base/connector.types';

export interface LinkAccountDto {
  vendor: string;
  category: string;
  api_key?: string;
  scopes?: string[];
  redirect_uri?: string;
  state?: string;
}

@Injectable()
export class LinkedAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorRegistry: ConnectorRegistry,
    @Inject(SECRETS_SERVICE) private readonly secrets: SecretsService,
  ) {}

  async startLink(customerId: string, dto: LinkAccountDto) {
    const connector = this.connectorRegistry.get(dto.vendor);

    if (dto.api_key) {
      // API key flow: encrypt and store directly
      const encrypted = await this.secrets.encrypt(JSON.stringify({ api_key: dto.api_key }));

      const account = await this.prisma.linkedAccount.create({
        data: {
          customer_id: customerId,
          vendor: dto.vendor,
          category: dto.category,
          credentials_ref: encrypted,
          scopes: dto.scopes ?? [],
          status: 'active',
          webhook_ids: [],
        },
      });

      // Register webhooks
      try {
        const credsObj: Credentials = { api_key: dto.api_key };
        const webhookIds = await connector.registerWebhooks({
          ...account,
          credentials_ref: dto.api_key,
          created_at: account.created_at,
        });
        await this.prisma.linkedAccount.update({
          where: { id: account.id },
          data: { webhook_ids: webhookIds },
        });
      } catch {
        // non-fatal
      }

      return { linked_account_id: account.id, status: 'connected' };
    }

    // OAuth flow: return auth URL
    const state = dto.state ?? customerId;
    const authUrl = connector.getAuthUrl(state);
    return { auth_url: authUrl };
  }

  async handleCallback(vendor: string, code: string, redirectUri: string) {
    const connector = this.connectorRegistry.get(vendor);
    const creds = await connector.exchangeCode(code, redirectUri);
    const encrypted = await this.secrets.encrypt(JSON.stringify(creds));

    const account = await this.prisma.linkedAccount.create({
      data: {
        customer_id: 'unknown', // will be updated from state param in real impl
        vendor,
        category: connector.category,
        credentials_ref: encrypted,
        scopes: [],
        status: 'active',
        webhook_ids: [],
      },
    });

    return account;
  }

  async listForCustomer(customerId: string) {
    return this.prisma.linkedAccount.findMany({
      where: { customer_id: customerId, status: { not: 'inactive' } },
    });
  }

  async disconnect(customerId: string, id: string) {
    const account = await this.prisma.linkedAccount.findFirst({
      where: { id, customer_id: customerId },
    });
    if (!account) throw new NotFoundException('LinkedAccount not found');

    // Attempt to deregister webhooks
    try {
      const connector = this.connectorRegistry.get(account.vendor);
      const creds: Credentials = { api_key: account.credentials_ref };
      for (const webhookId of account.webhook_ids) {
        const client = (connector as unknown as { getClient: (c: Credentials) => { delete: (path: string) => Promise<void> } }).getClient(creds);
        await client.delete(`/webhooks/${webhookId}`).catch(() => {/* ignore */});
      }
    } catch {
      // non-fatal
    }

    await this.prisma.linkedAccount.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  async getDecryptedCredentials(accountId: string): Promise<Credentials> {
    const account = await this.prisma.linkedAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('LinkedAccount not found');
    const raw = await this.secrets.decrypt(account.credentials_ref);
    return JSON.parse(raw) as Credentials;
  }
}
