-- SIFiscal - Migración 002: Declaraciones Mensuales y Anuales

CREATE TABLE IF NOT EXISTS declaraciones (
  id TEXT PRIMARY KEY,
  contribuyente_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  periodo TEXT NOT NULL,
  total_ingresos REAL DEFAULT 0,
  total_egresos REAL DEFAULT 0,
  iva_trasladado REAL DEFAULT 0,
  iva_acreditado REAL DEFAULT 0,
  iva_retenido REAL DEFAULT 0,
  iva_pagar REAL DEFAULT 0,
  base_gravable_isr REAL DEFAULT 0,
  tasa_isr REAL DEFAULT 0,
  isr_retenido REAL DEFAULT 0,
  isr_total REAL DEFAULT 0,
  isr_por_pagar REAL DEFAULT 0,
  estatus TEXT DEFAULT 'Borrador',
  fecha_presentacion TEXT,
  numero_operacion TEXT,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contribuyente_id) REFERENCES contribuyentes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_declaraciones_contribuyente ON declaraciones(contribuyente_id);
CREATE INDEX IF NOT EXISTS idx_declaraciones_tipo ON declaraciones(tipo);
CREATE INDEX IF NOT EXISTS idx_declaraciones_periodo ON declaraciones(periodo);
CREATE INDEX IF NOT EXISTS idx_declaraciones_estatus ON declaraciones(estatus);
