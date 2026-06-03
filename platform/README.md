# HR Integration Platform

A universal HR integration platform connecting ATS, HRIS, Payroll, and Performance systems through a unified API with AI-powered onboarding automation.

## Architecture

- **NestJS** modular monolith with dependency injection
- **PostgreSQL** + Prisma ORM for persistence
- **BullMQ** + Redis for async event processing
- **Anthropic Claude** for AI gap resolution, document verification, and field mapping
- **Multi-tenant** — every query scoped to `customer_id`

## Running Locally

### Prerequisites
- Docker + Docker Compose
- Node.js 20+

### Steps

```bash
# 1. Clone and enter the platform directory
cd platform

# 2. Copy and configure environment
cp .env.example .env
# Edit .env: set KMS_KEY, ANTHROPIC_API_KEY

# 3. Start infrastructure
docker compose up postgres redis -d

# 4. Install dependencies
npm install

# 5. Generate Prisma client
npm run prisma:generate

# 6. Run migrations
npm run prisma:migrate

# 7. Start the application
npm run start:dev
```

Or run everything with Docker Compose:
```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`.

## Key API Endpoints

All requests require the `X-Customer-Id` header.

### Linked Accounts
```
POST   /linked-accounts/link          # Connect a vendor (API key or OAuth)
GET    /linked-accounts/callback      # OAuth callback
GET    /linked-accounts               # List integrations
DELETE /linked-accounts/:id           # Disconnect
```

### Webhooks
```
POST   /webhooks/:vendor              # Inbound webhook endpoint
```

### Unified ATS API
```
GET    /unified/ats/candidates        # List candidates
GET    /unified/ats/candidates/:id    # Get candidate
GET    /unified/ats/applications      # List applications
```

### Unified HRIS API
```
GET    /unified/hris/employees        # List employees
GET    /unified/hris/employees/:id    # Get employee
```

### Onboarding
```
GET    /onboarding/:employee_id                          # Get employee + checklist
PATCH  /onboarding/:employee_id/checklist/:item_key     # Admin verify/reject item
POST   /onboarding/:employee_id/documents               # Upload document for AI verification
```

## Adding a New Connector

1. Create directory: `src/connectors/<vendor>/`

2. Create `<vendor>.connector.ts` extending `BaseConnector`:
```typescript
@Injectable()
export class MyConnector extends BaseConnector {
  readonly vendor = 'myvendor';
  readonly category = 'hris'; // or 'ats' | 'payroll' | 'performance'
  readonly capabilities = ['read:employees', 'write:employees'];

  // Implement all abstract methods...
  normalize(type: string, raw: unknown): CanonicalObject { /* ... */ }
  denormalize(type: string, obj: CanonicalObject): unknown { /* ... */ }
  // ...
}
```

3. Add connector to `ConnectorsModule`:
```typescript
@Module({
  providers: [ConnectorRegistry, ..., MyConnector],
  exports: [ConnectorRegistry, ..., MyConnector],
})
export class ConnectorsModule {}
```

4. Register in your app initializer or module `OnModuleInit`:
```typescript
this.registry.register(this.myConnector);
```

5. Add unit tests in `<vendor>.connector.spec.ts` with fixture data covering `normalize` and `denormalize`.

### Connector checklist
- [ ] `normalize` is a pure function (no side effects, same input → same output)
- [ ] `denormalize` is a pure function
- [ ] `verifyWebhook` uses timing-safe comparison for signatures
- [ ] `read` uses AsyncGenerator for lazy pagination
- [ ] All credentials come from the `Credentials` object, never from env directly
- [ ] Unit tests cover at least: field mapping, status mapping, date parsing, error cases

## Running Tests

```bash
# All unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

Tests use Jest with ts-jest. No external services are required — all DB/Redis/HTTP calls are mocked.

## Multi-Tenancy

Every database query **must** include `customer_id`. The Prisma middleware in `src/core/tenant/prisma-tenant.middleware.ts` enforces this at the query level. Attempting a cross-tenant read will throw an error.

Always pass `customer_id` from the `X-Customer-Id` request header, never from user-provided body parameters.

## Security Notes

- Credentials are encrypted with AES-256-GCM via `SecretsService` before storage
- The `KMS_KEY` environment variable must be a base64-encoded 32-byte key
- Raw credentials are never logged or stored in plaintext
- All AI calls log sanitized inputs only

## Right-to-Work Compliance

> AI verification assists review. **Final right-to-work determination is the responsibility of the human administrator.**

All checklist item overrides are recorded in the immutable `AuditLog` table.
