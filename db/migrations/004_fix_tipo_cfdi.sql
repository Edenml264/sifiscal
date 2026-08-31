-- SIFiscal - Migración 004: Corregir tipo_cfdi en facturas existentes
-- Marca como Nómina las facturas con uso CFDI CN01 (Comprobante de Nómina)

UPDATE facturas SET tipo_cfdi = 'Nomina' WHERE uso_cfdi = 'CN01';
UPDATE facturas SET tipo_cfdi = 'Ingreso' WHERE tipo_cfdi IS NULL;
