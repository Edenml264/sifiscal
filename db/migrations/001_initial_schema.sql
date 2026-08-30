-- SIFiscal - Migración inicial
-- Todas las tablas del sistema

-- Contribuyentes
CREATE TABLE IF NOT EXISTS contribuyentes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  rfc TEXT NOT NULL UNIQUE,
  curp TEXT,
  domicilio TEXT,
  correo TEXT,
  telefono TEXT,
  contacto TEXT,
  regimen_fiscal TEXT NOT NULL,
  estatus TEXT DEFAULT 'Activo',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contribuyentes_rfc ON contribuyentes(rfc);
CREATE INDEX IF NOT EXISTS idx_contribuyentes_regimen ON contribuyentes(regimen_fiscal);
CREATE INDEX IF NOT EXISTS idx_contribuyentes_estatus ON contribuyentes(estatus);

-- Obligaciones fiscales
CREATE TABLE IF NOT EXISTS obligaciones_fiscales (
  id TEXT PRIMARY KEY,
  contribuyente_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  periodo TEXT,
  fecha_vencimiento TEXT NOT NULL,
  estatus TEXT DEFAULT 'Pendiente',
  fecha_presentacion TEXT,
  numero_operacion TEXT,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contribuyente_id) REFERENCES contribuyentes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_obligaciones_contribuyente ON obligaciones_fiscales(contribuyente_id);
CREATE INDEX IF NOT EXISTS idx_obligaciones_tipo ON obligaciones_fiscales(tipo);
CREATE INDEX IF NOT EXISTS idx_obligaciones_vencimiento ON obligaciones_fiscales(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_obligaciones_estatus ON obligaciones_fiscales(estatus);

-- e.firma y CSD
CREATE TABLE IF NOT EXISTS efirma_csd (
  id TEXT PRIMARY KEY,
  contribuyente_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  folio TEXT,
  fecha_emision TEXT NOT NULL,
  fecha_vencimiento TEXT NOT NULL,
  estatus TEXT DEFAULT 'Vigente',
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contribuyente_id) REFERENCES contribuyentes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_efirma_contribuyente ON efirma_csd(contribuyente_id);
CREATE INDEX IF NOT EXISTS idx_efirma_tipo ON efirma_csd(tipo);
CREATE INDEX IF NOT EXISTS idx_efirma_vencimiento ON efirma_csd(fecha_vencimiento);

-- Documentos (Expediente digital)
CREATE TABLE IF NOT EXISTS documentos (
  id TEXT PRIMARY KEY,
  contribuyente_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo_archivo TEXT,
  datos_base64 TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contribuyente_id) REFERENCES contribuyentes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documentos_contribuyente ON documentos(contribuyente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_categoria ON documentos(categoria);

-- Notas y seguimiento
CREATE TABLE IF NOT EXISTS notas (
  id TEXT PRIMARY KEY,
  contribuyente_id TEXT,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  estatus TEXT DEFAULT 'Activo',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contribuyente_id) REFERENCES contribuyentes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notas_contribuyente ON notas(contribuyente_id);
CREATE INDEX IF NOT EXISTS idx_notas_tipo ON notas(tipo);

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  perfil TEXT NOT NULL,
  permisos TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);

-- Facturas (CFDI 4.0)
CREATE TABLE IF NOT EXISTS facturas (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  rfc_emisor TEXT NOT NULL,
  rfc_receptor TEXT NOT NULL,
  contribuyente_id TEXT NOT NULL,
  tipo_movimiento TEXT NOT NULL,
  metodo_pago TEXT NOT NULL,
  forma_pago TEXT,
  subtotal REAL NOT NULL,
  iva_trasladado REAL DEFAULT 0,
  iva_retenido REAL DEFAULT 0,
  isr_retenido REAL DEFAULT 0,
  total REAL NOT NULL,
  fecha_emision TEXT NOT NULL,
  fecha_pago TEXT,
  fecha_timbrado TEXT NOT NULL,
  uso_cfdi TEXT,
  serie TEXT,
  folio TEXT,
  estatus TEXT DEFAULT 'pendiente',
  xml_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contribuyente_id) REFERENCES contribuyentes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_facturas_uuid ON facturas(uuid);
CREATE INDEX IF NOT EXISTS idx_facturas_contribuyente ON facturas(contribuyente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha_emision ON facturas(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_facturas_estatus ON facturas(estatus);

-- Complementos de pago
CREATE TABLE IF NOT EXISTS complementos_pago (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  factura_relacionada_id TEXT NOT NULL,
  uuid_factura_relacionada TEXT NOT NULL,
  monto_pago REAL NOT NULL,
  fecha_pago TEXT NOT NULL,
  forma_pago TEXT NOT NULL,
  moneda TEXT DEFAULT 'MXN',
  tipo_cambio REAL DEFAULT 1.0,
  estatus TEXT DEFAULT 'activo',
  xml_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (factura_relacionada_id) REFERENCES facturas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_complementos_factura ON complementos_pago(factura_relacionada_id);
CREATE INDEX IF NOT EXISTS idx_complementos_fecha ON complementos_pago(fecha_pago);

-- Respaldos
CREATE TABLE IF NOT EXISTS respaldos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  tipo TEXT NOT NULL,
  tamano TEXT,
  archivo_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
