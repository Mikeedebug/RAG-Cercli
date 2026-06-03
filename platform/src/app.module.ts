import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './core/prisma/prisma.module';
import { SecretsModule } from './core/secrets/secrets.module';
import { AuditLogModule } from './core/audit-log/audit-log.module';
import { HttpClientModule } from './core/http-client/http-client.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { LinkedAccountsModule } from './linked-accounts/linked-accounts.module';
import { EventEngineModule } from './event-engine/event-engine.module';
import { WorkflowEngineModule } from './workflow-engine/workflow-engine.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AiModule } from './ai/ai.module';
import { UnifiedApiModule } from './unified-api/unified-api.module';
import { TenantMiddleware } from './core/tenant/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    }),
    PrismaModule,
    SecretsModule,
    AuditLogModule,
    HttpClientModule,
    ConnectorsModule,
    LinkedAccountsModule,
    EventEngineModule,
    WorkflowEngineModule,
    OnboardingModule,
    AiModule,
    UnifiedApiModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
