-- 006_disable_advance_payment_receipt_temp.sql
-- TEMP: Turn off mandatory advance payment receipt until feature is re-enabled.
-- Re-enable: set shop.is_advance_payment_receipt_mandatory = true and
-- ADVANCE_PAYMENT_RECEIPT_ENABLED in src/config/feature-flags.ts

UPDATE shop
SET is_advance_payment_receipt_mandatory = false
WHERE is_advance_payment_receipt_mandatory IS DISTINCT FROM false;
