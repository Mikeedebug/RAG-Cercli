-- Seed Lean demodesk signals and insight cards
-- Signals from two Demodesk calls (733e6decc0b5da2b and 586a0f94e5116fd3)

insert into signals (account_name, source, source_id, feature_request, verbatim_quote, signal_date) values
(
  'Lean', 'demodesk', '733e6decc0b5da2b',
  'GL/accounting report export in custom format for Wafik integration',
  'We haven''t integrated with Vafik before because just of like number of people that are using it. So we do have zero QuickBooks and all of that. The quick one is Samarth, once we have gone live, I will put you in touch with Sid from our finance team, who will then sit with you and figure out what is that GL report look like for you.',
  '2025-06-12T11:30:00Z'
),
(
  'Lean', 'demodesk', '733e6decc0b5da2b',
  'Admin-only mode: ability to hide employee self-service and payslips during onboarding',
  'We would disable, for example, pay slips and things like that. We would disable all of those. Nobody else get access. Is it purely just load, pay people, done through WPS for now?',
  '2025-06-12T11:30:00Z'
),
(
  'Lean', 'demodesk', '586a0f94e5116fd3',
  'Custom salary component: Other allowances (beyond basic, housing, transport)',
  'Our salary breakdown is basic salary and other allowances. It''s not categorized as if it''s housing or transport. Can we add that column? Other allowances, yeah.',
  '2025-06-16T08:00:00Z'
),
(
  'Lean', 'demodesk', '586a0f94e5116fd3',
  'Proration calculation based on working days (260 days/year)',
  'We use a 260 [days], correct? In our contract, it says 260. You''re the second customer to mention working days. So I''ll make sure to share that with the team.',
  '2025-06-16T08:00:00Z'
)
on conflict (source, source_id, feature_request) do nothing;

-- Insight cards for the same Lean demodesk signals

insert into insight_cards (type, title, body, related_account, source, source_id, signal_date, status) values
(
  'new_signal',
  'GL/accounting report export in custom format for Wafik integration',
  'We haven''t integrated with Vafik before. Samarth will sit with our finance team to figure out what the GL report format should look like so they can upload it at month end.',
  'Lean', 'demodesk', '733e6decc0b5da2b', '2025-06-12T11:30:00Z', 'pending'
),
(
  'new_signal',
  'Admin-only mode to hide employee self-service and payslips during onboarding',
  'Lean wants to onboard employees without giving them platform access yet. They asked to disable payslips and self-service features until they are ready.',
  'Lean', 'demodesk', '733e6decc0b5da2b', '2025-06-12T11:30:00Z', 'pending'
),
(
  'new_signal',
  'Custom salary component: Other allowances',
  'Lean''s salary structure uses "other allowances" as a category rather than housing/transport split. They asked if a custom column could be added to the salary template.',
  'Lean', 'demodesk', '586a0f94e5116fd3', '2025-06-16T08:00:00Z', 'pending'
),
(
  'new_signal',
  'Proration calculation based on working days (260 days/year)',
  'Lean''s contracts specify 260 working days for proration, but Cercli only supports calendar days, 30 days, or 365. Thomas noted Lean is the second customer to request this.',
  'Lean', 'demodesk', '586a0f94e5116fd3', '2025-06-16T08:00:00Z', 'pending'
)
on conflict do nothing;
