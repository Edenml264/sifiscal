-- SIFiscal - Migración 005: Reclassificar facturas existentes por Uso CFDI

-- Nómina (CN01, CN02): ingreso para el empleado, pero excluida de RESICO
UPDATE facturas SET tipo_movimiento = 'ingreso', tipo_cfdi = 'Nomina' WHERE uso_cfdi IN ('CN01', 'CN02');

-- Ingresos (G01, G03, I01-I07): ingreso para el contribuyente
UPDATE facturas SET tipo_movimiento = 'ingreso', tipo_cfdi = 'Ingreso' WHERE uso_cfdi IN ('G01', 'G03', 'I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07');

-- Egresos/Gastos (G02, D01-D07): egreso para el contribuyente
UPDATE facturas SET tipo_movimiento = 'egreso', tipo_cfdi = 'Egreso' WHERE uso_cfdi IN ('G02', 'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07');

-- Nulos: default a ingreso
UPDATE facturas SET tipo_movimiento = 'ingreso', tipo_cfdi = 'Ingreso' WHERE tipo_movimiento IS NULL;
