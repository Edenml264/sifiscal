-- Migración 006: Agregar columnas de nómina detallada a facturas
-- Percepciones: sueldo, aguinaldo, primaVacacional, primaDominical, horasExtra, PTU, otras
-- Deducciones: IMSS, ISR, INFONAVIT, SAR, pensionAlimenticia, otrasDeducciones
-- Otros pagos: subsidioAlEmpleo

ALTER TABLE facturas ADD COLUMN nomina_sueldo REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_aguinaldo REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_prima_vacacional REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_prima_dominical REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_horas_extra REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_ptu REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_otras_percepciones REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_imss REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_isr REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_infonavit REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_sar REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_pension_alimenticia REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_otras_deducciones REAL DEFAULT 0;
ALTER TABLE facturas ADD COLUMN nomina_subsidio_empleo REAL DEFAULT 0;
