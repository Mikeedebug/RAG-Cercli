import { Module } from '@nestjs/common';
import { LinkedAccountsController } from './linked-accounts.controller';
import { LinkedAccountsService } from './linked-accounts.service';
import { ConnectorsModule } from '../connectors/connectors.module';
import { SecretsModule } from '../core/secrets/secrets.module';

@Module({
  imports: [ConnectorsModule, SecretsModule],
  controllers: [LinkedAccountsController],
  providers: [LinkedAccountsService],
  exports: [LinkedAccountsService],
})
export class LinkedAccountsModule {}
