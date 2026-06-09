-- Thndr feature requests extracted from Demodesk call transcripts
-- Sources: 3 recorded calls (Payroll demo, Admin Training, Variable Sheet Review)

INSERT INTO signals (account_name, feature_request, source, source_id, signal_date, category) VALUES
('Thndr', 'Arabic language support for payslips', 'demodesk', 'demodesk-b0b4a509084316cd', '2025-06-10', NULL),
('Thndr', 'Overtime calculation by hours with labor law rate logic (not flat amounts)', 'demodesk', 'demodesk-f922fdf8823855dc', '2025-06-16', NULL),
('Thndr', 'Penalty and deduction calculation based on configurable rules', 'demodesk', 'demodesk-f922fdf8823855dc', '2025-06-16', NULL),
('Thndr', 'Bulk upload: use HR employee ID as identifier instead of email', 'demodesk', 'demodesk-f922fdf8823855dc', '2025-06-16', NULL),
('Thndr', 'Analytics dashboards with visual HR metrics (beyond downloadable reports)', 'demodesk', 'demodesk-8042bf79ec5245ff', '2025-03-12', NULL),
('Thndr', 'Automated probation period expiry alerts by email / Slack', 'demodesk', 'demodesk-b0b4a509084316cd', '2025-06-10', NULL),
('Thndr', 'ATS integration (Ashby / Greenhouse / Lever) for recruitment-to-HRIS sync', 'demodesk', 'demodesk-8042bf79ec5245ff', '2025-03-12', NULL);

INSERT INTO insight_cards (account_name, title, body, source, source_url, status) VALUES
('Thndr', 'Arabic language support for payslips', 'During admin onboarding call, Karim asked if payslips can be generated in Arabic. Thomas confirmed Arabic is not yet supported — only English payslips currently.', 'demodesk', 'https://demodesk.com/recordings/b0b4a509084316cd', 'pending'),
('Thndr', 'Overtime calculation by hours with labor law rate logic (not flat amounts)', 'Passant and Karim explained Egypt overtime rules: gross salary ÷ 240 hours × hours worked × rate multiplier (morning vs. night). Cercli currently requires flat amount input — cannot compute from hours.', 'demodesk', 'https://demodesk.com/recordings/f922fdf8823855dc', 'pending'),
('Thndr', 'Penalty and deduction calculation based on configurable rules', 'Thndr applies performance penalties as a reverse of the overtime formula. Currently these must be manually calculated offline and entered as flat amounts into Cercli.', 'demodesk', 'https://demodesk.com/recordings/f922fdf8823855dc', 'pending'),
('Thndr', 'Bulk upload: use HR employee ID as identifier instead of email', 'Passant asked why the bulk upload template requires email as the identifier — HR IDs are easier to work with internally and less error-prone than emails.', 'demodesk', 'https://demodesk.com/recordings/f922fdf8823855dc', 'pending'),
('Thndr', 'Analytics dashboards with visual HR metrics (beyond downloadable reports)', 'Mai Hemeida asked whether Cercli has any analytics dashboards. Akeed confirmed only downloadable reports exist currently — no visual dashboards.', 'demodesk', 'https://demodesk.com/recordings/8042bf79ec5245ff', 'pending'),
('Thndr', 'Automated probation period expiry alerts by email / Slack', 'Karim asked during admin training if Cercli sends automated alerts before probation periods end. Thomas said probation alerts are not yet available (only document expiry alerts).', 'demodesk', 'https://demodesk.com/recordings/b0b4a509084316cd', 'pending'),
('Thndr', 'ATS integration (Ashby / Greenhouse / Lever) for recruitment-to-HRIS sync', 'Zein mentioned Thndr plans to adopt an ATS (Ashby preferred) and needs it to integrate with their HRIS to avoid managing data in multiple systems.', 'demodesk', 'https://demodesk.com/recordings/8042bf79ec5245ff', 'pending');
