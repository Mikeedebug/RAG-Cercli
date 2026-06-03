import { Module } from '@nestjs/common';
import { ConnectorRegistry } from './connector.registry';
import { TeamtailorConnector } from './teamtailor/teamtailor.connector';
import { HumaansConnector } from './humaans/humaans.connector';
import { HttpClientModule } from '../core/http-client/http-client.module';

@Module({
  imports: [HttpClientModule],
  providers: [ConnectorRegistry, TeamtailorConnector, HumaansConnector],
  exports: [ConnectorRegistry, TeamtailorConnector, HumaansConnector],
})
export class ConnectorsModule {}
