# ADR 001: Connector Framework Design

## Status
Accepted

## Context
We need to integrate with multiple HR vendors (ATS, HRIS, Payroll, Performance). Each vendor has different authentication methods, webhook formats, data shapes, and API conventions. We need a pattern that allows adding new connectors without changing core platform code.

## Decision
Use an abstract base class `BaseConnector` that all vendor connectors must extend. The base class defines the contract:
- Authentication: `getAuthUrl`, `exchangeCode`, `refresh`
- Webhooks: `registerWebhooks`, `verifyWebhook`, `parseWebhook`
- Data access: `read` (AsyncGenerator for pagination), `write`
- Normalization: `normalize`, `denormalize` (pure functions)

A `ConnectorRegistry` is a NestJS injectable service that maps vendor names to connector instances. New connectors register themselves via the module.

## Consequences
**Positive:**
- New connectors are isolated — they cannot affect other connectors
- The base class enforces the full contract at compile time (TypeScript)
- Pure `normalize`/`denormalize` functions are trivially testable
- AsyncGenerator for `read` handles pagination without buffering entire result sets

**Negative:**
- Abstract class inheritance is less flexible than interface composition (mitigated by keeping the base class thin)
- Each connector must implement the full contract, even if some methods don't apply (e.g., API-key-only vendors must throw on `getAuthUrl`)

## Alternatives Considered
- **Plugin system with dynamic loading**: More flexible but complex and harder to type-check
- **Data-driven config JSON**: Simpler for field mapping but cannot handle custom auth logic or pagination strategies
- **Interface only (no base class)**: Would lose the ability to add shared utility methods in future
