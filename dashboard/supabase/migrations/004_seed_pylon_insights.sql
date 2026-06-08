-- Seed pending insight cards from Pylon tickets (extracted via MCP + Claude)
-- These appear in the Insight Feed for approval/dismissal

insert into insight_cards (type, title, body, related_account, source, source_id, signal_date, status) values

-- Thndr
('new_signal', 'Remove disclaimer option from letter templates', 'Option to delete disclaimer at end of letters', 'Thndr', 'pylon', '5da3a938-59e2-44c9-afaa-cad1a0337fc6', '2026-06-03T10:40:52Z', 'pending'),
('new_signal', 'Add level field to bulk onboarding import', 'Bulk onboarding: add level field', 'Thndr', 'pylon', 'f1bd833f-c4f2-456b-897d-e7dd8ae89e87', '2026-06-03T10:35:45Z', 'pending'),
('new_signal', 'Optional National ID / EID expiry fields with multi-field ID report', 'Optional National ID and EID expiry field; multi-field report with IDs', 'Thndr', 'pylon', '3c68a69f-4945-4d30-9ae5-3758a55c218f', '2026-06-01T07:22:17Z', 'pending'),
('new_signal', 'Remove mandatory travel dates from salary certificate', 'Salary Certificate Request: travel dates mandatory', 'Thndr', 'pylon', '20f386c9-d5d4-4d71-a7b0-90960fda2ae3', '2026-06-03T13:42:52Z', 'pending'),
('new_signal', 'Bilingual salary certificate (Arabic + English)', 'Salary Certificate Preview Language Issue', 'Thndr', 'pylon', '4cf6e82e-eca1-45d7-a29f-1441aa32b045', '2026-06-04T11:20:06Z', 'pending'),
('new_signal', 'Recurring adjustments report export fix', 'Export failure for recurring adjustments report', 'Thndr', 'pylon', 'adb42dd6-4b8b-4723-81e0-3b2e45b94459', '2026-06-04T13:00:35Z', 'pending'),

-- Exequt
('new_signal', 'Split salary payments across multiple bank accounts', 'Splitting received payments into multiple bank accounts', 'Exequt', 'pylon', '1d217e6c-1b45-4648-a371-3059e3c0a4b5', '2026-06-05T11:38:07Z', 'pending'),
('new_signal', 'Support USD company accounts (Starling and international banks)', 'Adding company USD account from Starling', 'Exequt', 'pylon', 'bba1af1d-1055-47df-938f-d8b23fd297fe', '2026-05-25T10:34:37Z', 'pending'),
('new_signal', 'Hourly rate to monthly salary conversion for contractors', 'Hourly rate for contractors requiring monthly salary', 'Exequt', 'pylon', 'ccf1b6f3-71c8-489d-b627-b4bb9eb9dcff', '2026-05-25T09:41:43Z', 'pending'),

-- Innovateliving
('new_signal', 'Delegation of authority workflow for approvals', 'Delegation of Authority feature request in system', 'Innovateliving', 'pylon', 'd0fa9ec1-8fd6-48ec-aa38-256aa851fa0c', '2026-06-08T13:00:31Z', 'pending'),

-- Fortis
('new_signal', 'Multi-level approvals with two approvers in first step', 'Multi-level approvals: two approvers in first tab', 'Fortis', 'pylon', 'fe28f96a-5211-4eba-b5cf-7fcd9613208f', '2026-06-03T07:10:01Z', 'pending'),
('new_signal', 'Fix payroll adjustments being dropped on payrun reopen', 'Deduction Reapplied After Feb Payrun', 'Fortis', 'pylon', 'cc70854b-6974-40f8-b60f-68a655c392e3', '2026-05-18T13:22:20Z', 'pending'),

-- Amazonas
('new_signal', 'Hospital/medical coverage module in EOR contracts', 'Hospital Coverage Inclusion Question', 'Amazonas', 'pylon', 'f0bd446f-0364-4940-96bc-98ba15edaca9', '2026-06-08T08:02:34Z', 'pending'),
('new_signal', 'Configurable payroll cut-off dates per entity', 'Payroll cut-off and payout timing for HMB/HMRE', 'Amazonas', 'pylon', 'c0690515-42d8-4c2b-be42-308fe291e5f2', '2026-06-08T10:23:25Z', 'pending'),
('new_signal', 'Payment reference email notifications on salary transfers', 'Missing payment reference email', 'Amazonas', 'pylon', '4bcdb00b-dac7-48c9-88cc-d875e6a858ea', '2026-05-22T13:13:59Z', 'pending'),
('new_signal', 'Fix report download stuck in pending status', 'Report download stuck in Pending status', 'Amazonas', 'pylon', '3c48928e-a0c7-49b5-8d27-ca273a86236d', '2026-06-01T12:16:12Z', 'pending'),

-- Platinumlist
('new_signal', 'Shift/roster scheduling for hourly staff', 'Roster creation for shift staff in Cercli', 'Platinumlist', 'pylon', '6eecc85e-6dd5-4b87-b9a6-fa65f86775e3', '2026-05-25T10:23:21Z', 'pending'),
('new_signal', 'Remote/international salary payments (Egypt and MENA)', 'Remote salaries update and delays in Egypt', 'Platinumlist', 'pylon', 'd3bc7577-4422-4f40-b38d-bbe0ca986d58', '2026-06-04T12:04:35Z', 'pending'),
('new_signal', 'Auto-populate bank name from IBAN on entry', 'Bank name auto-population after IBAN entry', 'Platinumlist', 'pylon', 'f06254a4-df1a-4f83-bf80-c2ea7250218a', '2026-05-19T11:40:51Z', 'pending'),
('new_signal', 'Adjustable payroll cut-off dates per payrun', 'Payroll cut-off date adjustment request', 'Platinumlist', 'pylon', 'b237c2cc-ded2-4e11-9d75-16e73d148b46', '2026-05-22T07:11:58Z', 'pending'),

-- Ziina
('new_signal', 'Pave API integration for compensation benchmarking', 'Pave API integrations with Cercli data', 'Ziina', 'pylon', '8ea85b25-218e-4d12-ac25-74b7e5fa73de', '2026-05-20T11:30:41Z', 'pending'),
('new_signal', 'Show total wired amount in payroll summary view', 'Feature suggestion: show total wired amount beside payroll totals', 'Ziina', 'pylon', 'cb5e94ec-555f-4b48-9c34-7279c74c3603', '2026-05-20T08:37:18Z', 'pending'),
('new_signal', 'Post-termination payslip access for offboarded employees', 'Offboarding access to payslips after termination', 'Ziina', 'pylon', '021ef954-79f6-483b-956b-99d6b60f976a', '2026-05-25T07:38:40Z', 'pending'),
('new_signal', 'Leave accrual transparency report', 'Leave accrual reporting questions and anomalies', 'Ziina', 'pylon', '8e05ed63-a86a-43c6-8d99-dceead66ee15', '2026-05-20T13:21:44Z', 'pending'),
('new_signal', 'Custom letter signatory and contact number in templates', 'Changing signatory on a letter and adding Ziina number to template', 'Ziina', 'pylon', 'c216a50e-bcc1-4d6c-9053-c8e40b119c0c', '2026-05-19T09:05:25Z', 'pending'),

-- Cleargrid
('new_signal', 'Multi-level approvals for letters, expenses, and time off', 'Multi-level approvals for Letter Requests, Expenses, and Time Off', 'Cleargrid', 'pylon', '1c98f1d2-609a-4086-a03d-8d495d986b03', '2026-05-22T11:40:22Z', 'pending'),
('new_signal', 'Employee self-service for asset and profile updates', 'Employee asset access and self-update permissions', 'Cleargrid', 'pylon', '2c9d9eae-4b51-4d34-8048-cfad2bcf3753', '2026-06-03T07:10:20Z', 'pending'),
('new_signal', 'Automated contract letter for bank account opening', 'Contract letter for bank account opening', 'Cleargrid', 'pylon', 'ef4fde9e-ded5-456c-9fde-f1053601c43e', '2026-05-25T11:33:34Z', 'pending'),
('new_signal', 'Prevent sick leave balance going negative', 'Sick leave balance negative prevention issue', 'Cleargrid', 'pylon', '2ea68e6e-bbea-4e29-b62e-9ac716e1e649', '2026-05-21T09:00:25Z', 'pending'),

-- Erad
('new_signal', 'Third-party integrations update (CRM/ATS/ERP)', 'Integrations Update Request', 'Erad', 'pylon', '9d08c031-f64e-4efc-9c52-92146bcfae88', '2026-05-22T06:57:50Z', 'pending'),
('new_signal', 'Payroll override for employees with pending labor ID/visa', 'Payroll override for pending labor ID Visa', 'Erad', 'pylon', 'f056144d-17a1-4739-bbd9-6e72b0b8d1f1', '2026-06-07T12:57:12Z', 'pending'),

-- Brkz
('new_signal', 'Probation period extension workflow', 'Extending probation period for a colleague', 'Brkz', 'pylon', 'dcdd378f-ed7b-40ac-995a-7f7b369da1d8', '2026-05-20T08:39:39Z', 'pending'),
('new_signal', 'MOHRE WPS compliance support for DMCC entities', 'MOHRE WPS Resolution 340/2026 applicability for DMCC entity', 'Brkz', 'pylon', '95ca0522-8f00-4a93-9421-83da7fb9fd6d', '2026-06-08T08:15:23Z', 'pending'),

-- Stake
('new_signal', 'Multi-entity employee status management', 'Employee status discrepancy: SHL/DIFC vs SPL', 'Stake', 'pylon', '0c246b3c-65b3-4ff1-8d25-70bbc8923763', '2026-06-03T07:40:39Z', 'pending'),
('new_signal', 'EOR vs direct hire visa and immigration guidance', 'EOR vs. direct visa and immigration support', 'Stake', 'pylon', '32ec852b-00f5-4b18-8875-342cab6acd99', '2026-06-03T23:16:30Z', 'pending'),

-- Proteinea
('new_signal', 'Equipment/asset request module with dedicated workflow', 'Equipment requests custom dedicated channel', 'Proteinea', 'pylon', '134b30e9-e663-4e86-b7d7-3e4c33298d57', '2026-06-06T09:25:56Z', 'pending'),
('new_signal', 'Add end-of-probation as an offboarding reason', 'Offboarding reasons: adding end of probation option', 'Proteinea', 'pylon', '47bd91f3-dc68-44d3-b710-af4f98b8204f', '2026-05-26T10:22:29Z', 'pending'),

-- Redenvelope
('new_signal', 'Role-based employee data access controls', 'Employee data access security concern in UAE Cercli', 'Redenvelope', 'pylon', '99e52f16-f2c7-49bd-8346-4f9d28d76505', '2026-06-03T13:12:43Z', 'pending'),
('new_signal', 'Off-cycle payroll for new joiners mid-month', 'Onboarding and Off-Cycle Payroll Clarification', 'Redenvelope', 'pylon', '7792978b-88ee-46a5-823a-32be47dbaf31', '2026-05-28T18:43:33Z', 'pending'),

-- Liabify
('new_signal', 'DEWS contribution management for 3rd party payors', 'DEWS contribution for staff as 3rd party Payor', 'Liabify', 'pylon', '2e0d093c-2463-4f94-b777-564df29c6971', '2026-06-08T07:20:06Z', 'pending'),

-- Supy
('new_signal', 'Configurable regional public holidays (Islamic calendar)', 'Islamic New Year date update on Cercli calendar', 'Supy', 'pylon', 'bcc6a7bd-ce6b-4b90-a0de-fadd2c46f02b', '2026-06-02T07:46:36Z', 'pending'),

-- Brainco
('new_signal', 'Early and off-cycle bonus payments for selected employees', 'Early bonus payments for selected employees', 'Brainco', 'pylon', 'd805f0ad-3005-429a-93cc-78b3574a2eb6', '2026-06-03T06:44:40Z', 'pending'),
('new_signal', 'Currency swap / FX conversion for salary reimbursements', 'Currency swap error on salary reimbursements', 'Brainco', 'pylon', 'ef029abb-cb72-42c7-b33e-6ba9c32c9c15', '2026-06-03T06:35:59Z', 'pending'),
('new_signal', 'Payroll history and bank update audit trail', 'Verification of Bank Update Status in Cercli History', 'Brainco', 'pylon', '667b9c1f-00c9-4c61-99ce-0b8902c05b69', '2026-05-20T21:17:39Z', 'pending'),

-- BreezAI
('new_signal', 'International bank account support (US/Charles Schwab)', 'Issue adding Charles Schwab Bank account', 'BreezAI', 'pylon', 'b950f0c6-4545-4ea5-adfd-953abc8a6343', '2026-05-26T13:55:38Z', 'pending'),
('new_signal', 'Mobile app login improvements', 'Login failure on mobile devices', 'BreezAI', 'pylon', 'f0eefba7-ad74-4cf6-b692-0b5c5f102d31', '2026-05-19T12:35:11Z', 'pending'),

-- 1001
('new_signal', 'WPS SIF file naming and CSV format compliance', 'SIF File Naming and CSV Formatting Issues', '1001', 'pylon', '8f855996-d016-4760-bc82-1f43113b8c47', '2026-05-26T10:03:37Z', 'pending'),

-- Manzil
('new_signal', 'Streamlined leave request approval workflow', 'Accepting leave requests workflow', 'Manzil', 'pylon', '7f902958-3142-41f4-9fad-d2450cc55d6e', '2026-05-24T08:45:08Z', 'pending'),

-- 28 Lightbulbs
('new_signal', 'Push notifications to managers for expense approvals', 'Expense approval notifications not received by manager', '28 Lightbulbs', 'pylon', 'd3501f7a-d63c-45ed-a30a-92aebcb7f759', '2026-05-19T13:23:50Z', 'pending'),
('new_signal', 'Auto-remove offboarded employees from active payroll', 'Offboarded employee still appears in May payroll', '28 Lightbulbs', 'pylon', '73754da6-2dc3-4848-b597-8fd9d9bb48bb', '2026-06-01T09:03:30Z', 'pending'),

-- Total Office
('new_signal', 'Time-off approver reassignment', 'Time-off approver updates', 'Total Office', 'pylon', '71c4e7fe-6e93-4d23-a88c-c7948520b2f4', '2026-05-22T08:36:25Z', 'pending'),
('new_signal', 'Real-time payroll summary update on employee offboarding', 'Payroll: Krista offboard not reflected in June summary', 'Total Office', 'pylon', '219d9c2a-d091-4aff-b48f-ad849716c130', '2026-06-02T09:52:07Z', 'pending'),

-- Lean
('new_signal', 'EOS/gratuity payrun processing improvements', 'EOS Payrun 2 April Processing for Zeyad', 'Lean', 'pylon', 'd8d790f0-f732-41cd-a80e-fe85ff5bf57a', '2026-05-20T12:04:55Z', 'pending'),

-- Vision Bank
('new_signal', 'Escalation path to human support agent from chat', 'Request for human support assistance', 'Vision Bank', 'pylon', '78bf92f1-926a-4ff3-ac66-d68ecc3cc6e5', '2026-05-21T12:02:31Z', 'pending'),

-- Mal
('new_signal', 'Leave balance carry-over from prior year', 'Leave allowance excludes last year earned days', 'Mal', 'pylon', 'bf7b2af7-58ee-4320-a039-0f3bad89a7be', '2026-05-20T07:58:28Z', 'pending'),

-- Tabadulat
('new_signal', 'Automated overpayment deduction in payroll', 'Invoice delivery: Cercli March and April; overpayment deduction', 'Tabadulat', 'pylon', 'c4a76b9b-e97d-4b8c-bc75-dfe10381cbfd', '2026-05-20T11:06:50Z', 'pending'),

-- Enigma
('new_signal', 'Post-offboarding personal data access for employees', 'Offboarded employee personal data access', 'Enigma', 'pylon', 'cfe894b3-0156-4031-b809-c79e333d6dfb', '2026-05-19T07:06:43Z', 'pending'),

-- Whitehelmet
('new_signal', 'Real-time salary payment status notifications', 'Salary payout timeline after payment completion', 'Whitehelmet', 'pylon', '8e0d227e-54ec-4bd9-8702-6be9b6ad342b', '2026-05-23T12:43:34Z', 'pending'),

-- Alaan
('new_signal', 'GOSI deduction management for Saudi Arabia payroll', 'GOSI deduction update for Dania', 'Alaan', 'pylon', '04c84bfa-270b-4f8b-80d4-388ed4e4c4c7', '2026-05-21T17:19:06Z', 'pending'),
('new_signal', 'KSA payrun reopen functionality', 'Reopen KSA Payrun for May', 'Alaan', 'pylon', '0bc20909-06ef-42d5-8944-73a519e0acac', '2026-05-21T13:10:59Z', 'pending'),

-- Humantra
('new_signal', 'Expense approvals auto-inclusion in payroll run', 'Expense approvals missing from this month''s payroll', 'Humantra', 'pylon', '6db7fdef-682b-4d00-a272-731e7425756d', '2026-05-21T06:58:59Z', 'pending'),
('new_signal', 'Configurable payroll dates for Islamic holidays (Eid)', 'Payroll date adjustments for Eid 2026', 'Humantra', 'pylon', '9d77922e-ae3f-461c-98ee-0bb3b1669ca8', '2026-05-20T06:13:33Z', 'pending'),

-- Lune
('new_signal', 'Competitive FX rates for international salary transfers', 'Salary transfer: Poor exchange rate compared to bank rate', 'Lune', 'pylon', '49a6ab5c-6bb0-4941-86c0-4637a37977ee', '2026-05-21T12:57:22Z', 'pending'),

-- Consultify Global
('new_signal', 'Real-time salary change reflection in open payrun', 'Salary changes reflection in payroll', 'Consultify Global', 'pylon', '3b847791-4e37-4d90-bebe-ae964f6aaecd', '2026-05-21T17:12:43Z', 'pending'),

-- Altalal
('new_signal', 'Multi-entity invoice generation per payroll run', 'Invoice generation for Echelon payroll in CERCLI', 'Altalal', 'pylon', '0c48638e-daac-40c5-944a-c251c4c2064a', '2026-05-19T07:31:59Z', 'pending'),

-- Adms Technology
('new_signal', 'Payroll settlement confirmation notifications', 'Payroll settlement confirmation for this month', 'Adms Technology', 'pylon', '94daa132-65f1-42b6-9be3-a1c572ae774d', '2026-05-20T06:42:14Z', 'pending'),

-- Propelgtm
('new_signal', 'Emirates ID eligibility validation for UAE employee onboarding', 'Emirates ID entry eligibility for UAE', 'Propelgtm', 'pylon', '259a5db8-2a3b-411c-b6a9-8f9af1fdd32b', '2026-05-28T11:52:24Z', 'pending'),

-- Dubicars
('new_signal', 'Leave approval for subordinate and nested team structures', 'Leave approval issue for subordinate team', 'Dubicars', 'pylon', 'b186b589-acaa-4aa0-8214-6191231cd5f7', '2026-05-22T05:53:56Z', 'pending'),

-- OnTheList
('new_signal', 'Prorated leave balance calculation on employee offboarding', 'Prorated Leave Balance for Offboarded Employee', 'OnTheList', 'pylon', '8a500a08-0c22-4405-8b1a-884ac45a5252', '2026-06-04T07:06:28Z', 'pending'),

-- Durlston
('new_signal', 'Total annual wage roll historical report', 'Total Wage Roll for Last Financial Year', 'Durlston', 'pylon', 'e5a0f234-5248-4643-a37a-8e37b5e2500a', '2026-06-03T07:35:05Z', 'pending'),
('new_signal', 'WPS compliance and SIF support for DMCC entities', 'MOHRE WPS Resolution 340/2026 applicability for DMCC entity', 'Durlston', 'pylon', '522d73fa-dcae-4174-bf92-f676423c40da', '2026-06-04T09:03:48Z', 'pending'),

-- Elevate
('new_signal', 'User-level payment history report export', 'Payments report for a user in 2025', 'Elevate', 'pylon', '10fa6957-ea8d-4b36-bf27-08b78e663da4', '2026-05-29T06:35:54Z', 'pending'),

-- Nxg
('new_signal', 'Fix invoice download failure in payroll admin', 'March payroll admin: unable to download invoices', 'Nxg', 'pylon', '76b57e45-2ca8-4705-bfe8-f728c2997c81', '2026-05-19T05:34:05Z', 'pending'),

-- Creativemules
('new_signal', 'International payment support for restricted regions', 'Payments to Russia eligibility inquiry', 'Creativemules', 'pylon', '54668b33-6977-47a1-85cf-8ec6bc925cc6', '2026-05-26T13:45:22Z', 'pending')

on conflict do nothing;
