# ADR 003: AI Layer Design

## Status
Accepted

## Context
We use Anthropic Claude for three purposes:
1. **Gap resolution**: Inferring missing employee fields from candidate/application data
2. **Document verification**: Extracting and validating fields from uploaded RTW documents
3. **Field mapping**: Proposing mappings between vendor payloads and canonical model fields

All three touch sensitive personal data and operate in a regulated HR context (right-to-work checks have legal implications). AI failures must never block the core HR workflow.

## Decision

### Non-blocking AI calls
All AI service calls are wrapped in try/catch. On failure, the service returns a safe degraded result (e.g., all fields flagged for manual review). This ensures that a Claude API outage never prevents an employee from being created or a checklist from being generated.

### Audit logging
Every AI call logs to `AiCallLog` with: model version, token counts, cost estimate, purpose, sanitized input, and output. This provides:
- Cost attribution per customer
- Audit trail for regulatory enquiries
- Debugging data for model quality improvement

### Human-in-the-loop for RTW
Document verification results always include a disclaimer: *"AI verification assists review. Final right-to-work determination is the responsibility of the human administrator."* Checklist items can be overridden by admins, and all overrides are recorded in `AuditLog`.

### Model selection
Use `claude-sonnet-4-5` as the default model — better cost/quality balance than Opus for structured extraction tasks, faster than Haiku with sufficient accuracy for HR field inference.

## Consequences
**Positive:**
- Regulatory compliance: human remains responsible for RTW decisions
- Cost transparency: every penny of AI spend is attributable
- Resilience: AI failures degrade gracefully

**Negative:**
- Additional DB writes per AI call (mitigated by async logging)
- Claude vision API requires image MIME types; PDF documents need pre-processing in future iterations

## Alternatives Considered
- **Synchronous AI gates**: Rejected — would make onboarding flow dependent on AI availability
- **Local models**: Insufficient accuracy for document OCR at this stage
- **No AI logging**: Rejected — required for GDPR accountability and cost management
