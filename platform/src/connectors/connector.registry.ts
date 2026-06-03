import { Injectable } from '@nestjs/common';
import { BaseConnector } from './base/base.connector';

@Injectable()
export class ConnectorRegistry {
  private readonly connectors = new Map<string, BaseConnector>();

  register(connector: BaseConnector): void {
    this.connectors.set(connector.vendor, connector);
  }

  get(vendor: string): BaseConnector {
    const connector = this.connectors.get(vendor);
    if (!connector) {
      throw new Error(`No connector registered for vendor: ${vendor}`);
    }
    return connector;
  }

  listVendors(): string[] {
    return Array.from(this.connectors.keys());
  }
}
