-- Fix purchasing_reminders shortage_qty to accept decimal values
ALTER TABLE purchasing_reminders 
ALTER COLUMN shortage_qty TYPE NUMERIC(10,2);
