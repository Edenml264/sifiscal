-- Migration 007: Add payment fields to obligaciones_fiscales
-- Adds fecha_pago and comprobante_pago for tracking when obligations are paid

ALTER TABLE obligaciones_fiscales ADD COLUMN fecha_pago TEXT;
ALTER TABLE obligaciones_fiscales ADD COLUMN comprobante_pago TEXT;
