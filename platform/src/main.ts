import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new Logger('Bootstrap');

  // Add X-Trace-Id to all responses
  app.use((req: Request, res: Response, next: NextFunction) => {
    const traceId = (req.headers['x-trace-id'] as string) ?? uuidv4();
    res.setHeader('X-Trace-Id', traceId);
    next();
  });

  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

bootstrap().catch(console.error);
