-- Add category column to signals for product area tagging
alter table signals add column if not exists category text;
