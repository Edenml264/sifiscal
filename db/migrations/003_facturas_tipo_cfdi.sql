-- SIFiscal - Migración 003: Tipo de CFDI en facturas
-- Permite distinguir Nómina de facturas de ingreso/egreso

ALTER TABLE facturas ADD COLUMN tipo_cfdi TEXT DEFAULT 'Ingreso';

UPDATE facturas SET tipo_cfdi = 'Ingreso' WHERE tipo_cfdi IS NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_tipo_cfdi ON facturas(tipo_cfdi);
