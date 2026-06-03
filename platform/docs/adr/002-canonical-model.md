# ADR 002: Canonical Data Model

## Status
Accepted

## Context
Different HR vendors use wildly different field names, data types, and relationship structures. We need a unified model that all platform consumers can rely on, while preserving vendor-specific data for debugging and custom integrations.

## Decision
Define canonical TypeScript interfaces for each HR object type (Candidate, Application, Employee). Each canonical object includes:
- **Standard fields**: typed, named in snake_case, documented
- `remote_id`: the vendor's own identifier (for sync/update operations)
- `linked_account_id`: which integration the record came from
- `customer_id`: tenant isolation
- `remote_data: Json`: the complete raw vendor payload, stored as-is
- `custom_fields: Json`: customer-defined extensions

Schema evolution follows **additive-only** changes: new fields are always optional. Breaking changes require a new model version.

## Consequences
**Positive:**
- `remote_data` blob means we never lose vendor data, even for fields not in the canonical model
- Additive-only policy means no consumer migrations when we add fields
- `custom_fields` allows customers to extend the model without schema changes

**Negative:**
- `remote_data` can grow large; mitigate with periodic pruning for fields that have been promoted to canonical
- Not all vendor concepts map cleanly to canonical types; edge cases require careful documentation

## Alternatives Considered
- **Fully dynamic JSON**: No type safety, hard to validate
- **Per-vendor schemas only**: No unified API surface possible
- **GraphQL federation**: Too complex for v1; revisit when >10 connectors
