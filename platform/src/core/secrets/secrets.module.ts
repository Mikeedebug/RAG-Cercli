import { Module } from '@nestjs/common';
import { AesSecretsService } from './secrets.service';

export const SECRETS_SERVICE = 'SECRETS_SERVICE';

@Module({
  providers: [
    {
      provide: SECRETS_SERVICE,
      useClass: AesSecretsService,
    },
  ],
  exports: [SECRETS_SERVICE],
})
export class SecretsModule {}
