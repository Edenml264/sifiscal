# PROJECT_PLAN.md - SIFiscal: Sistema de Control Fiscal para México

**Fuente de Verdad para el Desarrollo**
Enfoque: Múltiples contribuyentes - Personas Físicas y Morales
Cumplimiento: ISR, IVA y obligaciones bajo esquema de flujo de efectivo
Stack: Astro JS + Turso + Bootstrap 5

---

## Estado de Desarrollo

| Fase | Módulo | Estado | Archivos |
|------|--------|--------|----------|
| 1 | Auth + Setup | ✅ Completada | `turso.ts`, `auth.ts`, `middleware.ts`, `seed.ts` |
| 2 | Contribuyentes | ✅ Completada | `api/contribuyentes.ts`, `contribuyentes/index.astro`, `contribuyentes/[id].astro` |
| 3 | Obligaciones Fiscales | ✅ Completada | `api/obligaciones.ts`, `obligaciones/index.astro` |
| 4 | Calendario Fiscal | ✅ Completada | `api/calendario.ts`, `calendario.astro` |
| 5 | e.firma y CSD | ✅ Completada | `api/efirma.ts`, `efirma.astro` |
| 6 | Dashboard | ✅ Completada | `api/dashboard.ts`, `dashboard.astro` |
| 7 | Sidebar y Navegación | ✅ Completada | `Sidebar.astro`, `DashboardLayout.astro`, `BaseLayout.astro` |
| 8 | Expediente Digital | ✅ Completada | `api/documentos.ts`, `expediente.astro` |
| 9 | Notas y Seguimiento | ✅ Completada | `api/notas.ts`, `notas.astro` |
| 10 | Usuarios y Permisos | ✅ Completada | `api/usuarios.ts`, `usuarios.astro` |
| 11 | Respaldos | ✅ Completada | `api/respaldos.ts`, `respaldos.astro` |
| 12 | Reportes | ✅ Completada | `api/reportes.ts`, `reportes.astro` |
| 13 | Procesador XML (CFDI 4.0) | ✅ Completada | `api/facturas.ts`, `facturas.astro` |
| 14 | Vista Centralizada Contribuyente | ✅ Completada | `contribuyentes/[id].astro` (6 tabs) |
| 15 | Declaraciones Mensuales/Anuales | ✅ Completada | `api/declaraciones.ts`, `contribuyentes/[id].astro` |
| 16 | Declaración Sueldos y Salarios | ✅ Completada | `calculations.ts`, `declaraciones.ts` |
| 17 | Tabla Calendario Resumen | ✅ Completada | `declaraciones.ts`, `contribuyentes/[id].astro` |

### Pendientes Técnicos (Producción)

| # | Pendiente | Prioridad | Descripción |
|---|-----------|-----------|-------------|
| 1 | Paginación en más tablas | Media | Solo contribuyentes tiene paginación |
| 2 | Exportar a Excel | Baja | Descargar reportes en XLSX |
| 3 | Parseo nómina complement | Media | Extraer percepciones/deducciones del XML de nómina |
| 4 | Deducciones personales manuales | Media | Captura de gastos médicos, colegiaturas, etc. |

---

## 1. Stack Tecnológico

- **Framework**: Astro JS (SSR/Hybrid)
- **UI Framework**: Bootstrap 5.3.3
- **Base de Datos**: Turso (LibSQL/SQLite) - desarrollo local con `file:local.db`
- **Despliegue**: Netlify (SSR con @astrojs/netlify)
- **Desarrollo Local**: @astrojs/node (adapter condicional)
- **Parser XML**: fast-xml-parser
- **Lenguaje**: TypeScript (server) / JavaScript puro (client-side inline scripts)
- **Almacenamiento local**: localStorage (respaldos del navegador)
- **Autenticación**: bcryptjs (hash de contraseñas)

### Configuración de Adaptadores

```javascript
// astro.config.mjs
const isDev = process.env.NODE_ENV !== 'production';
adapter: isDev
  ? node({ mode: 'standalone' })    // Local dev
  : netlify(),                       // Producción Netlify
```

---

## 2. Arquitectura de Módulos

### Módulo 1: Dashboard General ✅
- Total de contribuyentes registrados
- Obligaciones próximas a vencer (30 días)
- Obligaciones vencidas
- Avisos pendientes
- e.firmas próximas a vencer
- Certificados de Sello Digital (CSD) próximos a vencer
- Alertas y pendientes importantes

### Módulo 2: Gestión de Contribuyentes ✅
- Nombre o razón social
- RFC (con validación mexicana)
- CURP (con validación, opcional)
- Domicilio fiscal
- Correo electrónico
- Teléfono
- Persona de contacto
- Régimen fiscal (16 regímenes vigentes 2026)
- Estatus del contribuyente (Activo/Inactivo)

### Módulo 3: Obligaciones Fiscales ✅
- ISR, IVA, Retenciones
- Declaraciones mensuales y anuales
- DIOT
- Informativas
- Avisos al RFC
- Contabilidad electrónica
- Otras obligaciones

### Módulo 4: Calendario Fiscal ✅
- Grid mensual 7 columnas (Dom-Sáb)
- Navegación entre meses
- Filtro por contribuyente
- Colores por estatus de obligación
- Lista del día seleccionado

### Módulo 5: Control de e.firma y CSD ✅
- Tabs por tipo (e.firma / CSD)
- Fecha de emisión y vencimiento
- Cálculo de días restantes
- Alertas de renovación
- Sin almacenar contraseñas sensibles

### Módulo 6: Expediente Digital ✅
- Constancia de Situación Fiscal
- Opinión de Cumplimiento
- Acuse de inscripción
- Avisos al RFC
- Poderes e Identificaciones
- Formatos: PDF, JPG, PNG

### Módulo 7: Notas y Seguimiento ✅
- Notas por contribuyente
- Pendientes
- Observaciones
- Historial de actividades

### Módulo 8: Usuarios y Permisos ✅
- Perfiles: Administrador, Contador, Auxiliar, Consulta
- Permisos por módulo (lectura/escritura)

### Módulo 9: Respaldos ✅
- Respaldo manual y automático
- Exportación e importación (JSON)

### Módulo 10: Reportes ✅
- Obligaciones pendientes/presentadas
- Próximos vencimientos
- e.firmas y CSD por vencer
- Generación PDF

### Módulo 11: Procesador XML (CFDI 4.0) ✅
- Parser de XML CFDI 4.0 con soporte completo
- Clasificación automática por RFC (Ingreso/Egreso)
- Detección de complementos: Nómina (CN01/CN02), Complemento Pago (CP01)
- Manejo de PPD (Parcialidades) y PUE (Una Exhibición)
- Cálculo de ISR e IVA
- Upload múltiple de XMLs

### Módulo 12: Declaraciones Fiscales ✅
- Declaración Mensual RESICO (Art. 113-E LISR)
- Declaración Anual RESICO (Art. 113-E LISR)
- Declaración Anual Sueldos y Salarios (Art. 152 LISR)
- Tabla calendario resumen ENE-DIC + ANUAL
- Filtro RESICO / Sueldos y Salarios
- Cálculo on-the-fly desde facturas

---

## 3. Arquitectura de Datos (SQL)

### Tabla: `contribuyentes` ✅
```sql
CREATE TABLE contribuyentes (
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
```

### Tabla: `obligaciones_fiscales` ✅
```sql
CREATE TABLE obligaciones_fiscales (
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
```

### Tabla: `efirma_csd` ✅
```sql
CREATE TABLE efirma_csd (
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
```

### Tabla: `documentos` ✅
```sql
CREATE TABLE documentos (
  id TEXT PRIMARY KEY,
  contribuyente_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo_archivo TEXT,
  datos_base64 TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contribuyente_id) REFERENCES contribuyentes(id) ON DELETE CASCADE
);
```

### Tabla: `notas` ✅
```sql
CREATE TABLE notas (
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
```

### Tabla: `usuarios` ✅
```sql
CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  perfil TEXT NOT NULL,
  permisos TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Tabla: `facturas` ✅
```sql
CREATE TABLE facturas (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  rfc_emisor TEXT NOT NULL,
  rfc_receptor TEXT NOT NULL,
  contribuyente_id TEXT NOT NULL,
  tipo_movimiento TEXT NOT NULL,
  tipo_cfdi TEXT DEFAULT 'Ingreso',
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
```

### Tabla: `declaraciones` ✅
```sql
CREATE TABLE declaraciones (
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
```

### Tabla: `complementos_pago` ✅
```sql
CREATE TABLE complementos_pago (
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
```

### Tabla: `respaldos` ✅
```sql
CREATE TABLE respaldos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  tipo TEXT NOT NULL,
  tamano TEXT,
  archivo_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
```

---

## 4. Reglas de Negocio Fiscales

### 1. Clasificación Automática (Ingreso vs Egreso)
- **Ingreso**: Cuando `rfc_emisor` == `rfc_usuario` (emitió factura, recibió dinero)
- **Egreso**: Cuando `rfc_receptor` == `rfc_usuario` (recibió factura de proveedor)
- **Excepciones**:
  - CN01/CN02 (Nómina) → SIEMPRE "ingreso" (empleado recibe salario)
  - CP01 (Complemento Pago) → SIEMPRE "ingreso" (contribuyente cobra)

### 2. Cálculo de Impuestos según Método de Pago

#### PUE (Pago en Una Exhibición)
- El impuesto se cuenta al emitir el CFDI
- `fecha_pago = fecha_emision`
- Estatus se marca 'pagada' automáticamente

#### PPD (Pago en Parcialidades)
- El impuesto NO se cuenta hasta registrar el Complemento de Pago
- `fecha_pago = NULL` inicialmente
- Cuando llega CP01 → se actualiza `fecha_pago` en la factura original
- Estatus permanece 'pendiente' hasta liquidar todos los pagos

### 3. Cálculo de ISR

#### RESICO (Mensual/Anual) - Art. 113-E LISR
| Ingreso Mensual | Tasa |
|-----------------|------|
| Hasta $25,000 | 1.00% |
| $25,000.01 - $50,000 | 1.40% |
| $50,000.01 - $83,333 | 2.15% |
| $83,333.01 - $208,333 | 3.50% |
| $208,333.01 - $350,000 | 4.75% |
| $350,000.01 - $450,000 | 5.95% |
| Más de $450,000 | 6.40% |

#### Sueldos y Salarios (Anual) - Art. 152 LISR
| Ingreso Anual | Cuota Fija | Tasa |
|---------------|------------|------|
| $0.01 - $348,440.02 | $0.00 | 1.92% |
| $348,440.02 - $580,733.04 | $5,920.04 | 6.40% |
| $580,733.04 - $1,120,041.06 | $20,770.96 | 21.36% |
| $1,120,041.06 - $1,294,914.06 | $135,366.04 | 23.52% |
| $1,294,914.06 - $1,555,895.06 | $176,430.56 | 30.00% |
| $1,555,895.06 - $3,111,790.06 | $254,724.92 | 32.00% |
| $3,111,790.06 - $4,149,053.06 | $753,371.32 | 34.00% |
| Más de $4,149,053.06 | $1,106,400.72 | 35.00% |

#### Subsidio al Empleo Anual
| Ingreso Anual | Subsidio |
|---------------|----------|
| $0.01 - $108,972.00 | $4,881.96 |
| Más de $108,972.00 | $0.00 |

### 4. Deducciones Personales (Art. 151 LISR)
- Tope: Mínimo(5 × UMA anuales, 15% de ingresos anuales)
- UMA anual 2026: $106,567.56
- Códigos de uso CFDI excluidos de RESICO: D01-D07, 010
- Solo aplican en declaración Anual Sueldos y Salarios

### 5. Exclusiones de Cálculo
- **RESICO**: Excluye facturas con `tipo_cfdi = 'Nomina'` y `uso_cfdi IN (D01-D07, 010)`
- **Sueldos y Salarios**: Solo incluye facturas con `tipo_cfdi = 'Nomina'` (CN01/CN02)

### 6. Régimen Fiscal 2026

| Código | Régimen |
|--------|---------|
| 601 | General de Ley Personas Morales |
| 603 | Personas Morales con Fines no Lucrativos |
| 605 | Sueldos y Salarios |
| 606 | Arrendamiento |
| 607 | Actividades Empresariales y Profesionales |
| 612 | Simplificado de Confianza (RESICO) |
| 614 | Incorporación Fiscal |
| 615 | Enajenación o Adquisición de Inmuebles |
| 616 | Depósitos en Efectivo |
| 620 | Sociedades Cooperativas de Producción |
| 621 | Plataformas Tecnológicas |
| 622 | Enajenación de Acciones |
| 623 | Dividendos |
| 624 | Intereses |
| 625 | Premios |
| 626 | Fideicomisos |

### 7. Clasificación de CFDI (Columna Tabla Facturas)

| Badge | Tipo | Códigos |
|-------|------|---------|
| RESICO | Ingreso/Egreso RESICO | G01, G03, I01, etc. |
| Nómina | Sueldos y salarios | CN01, CN02 |
| Deducciones | Gastos personales | D01-D07, 010 |
| CxP | Complemento de pago | CP01 |

---

## 5. Estructura de Carpetas

```
sifiscal/
├── src/
│   ├── pages/
│   │   ├── index.astro                    # Login ✅
│   │   ├── dashboard.astro                # Dashboard ✅
│   │   ├── calendario.astro               # Calendario fiscal ✅
│   │   ├── efirma.astro                   # Control e.firma/CSD ✅
│   │   ├── contribuyentes/
│   │   │   ├── index.astro                # Listado ✅
│   │   │   └── [id].astro                 # Detalle (6 tabs) ✅
│   │   ├── obligaciones/
│   │   │   └── index.astro                # Listado ✅
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login.ts               # POST login ✅
│   │       │   └── logout.ts              # GET logout ✅
│   │       ├── dashboard.ts               # GET KPIs ✅
│   │       ├── contribuyentes.ts          # CRUD ✅
│   │       ├── obligaciones.ts            # CRUD ✅
│   │       ├── calendario.ts              # GET por mes ✅
│   │       ├── efirma.ts                  # CRUD ✅
│   │       ├── documentos.ts              # CRUD ✅
│   │       ├── notas.ts                   # CRUD ✅
│   │       ├── facturas.ts                # CRUD + XML parsing ✅
│   │       ├── declaraciones.ts           # CRUD + Cálculos ✅
│   │       ├── usuarios.ts                # CRUD ✅
│   │       ├── respaldos.ts               # CRUD ✅
│   │       └── reportes.ts                # GET reportes ✅
│   ├── lib/
│   │   ├── turso.ts                       # Cliente Turso ✅
│   │   ├── auth.ts                        # Autenticación ✅
│   │   ├── validations.ts                 # Validaciones ✅
│   │   ├── xml-parser.ts                  # Parser CFDI + Clasificación ✅
│   │   └── calculations.ts                # ISR/IVA + Sueldos y Salarios ✅
│   ├── components/
│   │   └── Sidebar.astro                  # Menú lateral ✅
│   ├── layouts/
│   │   ├── BaseLayout.astro               # Layout login ✅
│   │   └── DashboardLayout.astro          # Layout principal ✅
│   ├── middleware.ts                       # Auth middleware ✅
│   ├── scripts/
│   │   └── seed.ts                        # Inicialización DB + migrations ✅
│   └── styles/
│       └── global.css                     # Estilos sidebar ✅
├── db/
│   └── migrations/
│       ├── 001_initial_schema.sql         # 8 tablas base ✅
│       ├── 002_declaraciones.sql          # Tabla declaraciones ✅
│       ├── 003_facturas_tipo_cfdi.sql     # Columna tipo_cfdi ✅
│       ├── 004_fix_tipo_cfdi.sql          # Migración datos Nómina ✅
│       └── 005_reclassify_facturas.sql    # Reclassificación por RFC ✅
├── astro.config.mjs                       # Config adaptadores condicional ✅
├── netlify.toml                           # Config Netlify ✅
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── PROJECT_PLAN.md
└── README.md
```

---

## 6. Tabla Calendario Resumen (Declaraciones)

La tabla calendario muestra un resumen mes a mes de las declaraciones con las siguientes filas:

### Vista RESICO
| Descripción | ENE | FEB | ... | DIC | ANUAL |
|-------------|-----|-----|-----|-----|-------|
| Total Ingresos | $X | $X | ... | $X | $XX |
| Total Egresos | $X | $X | ... | $X | $XX |
| ISR a Pagar | $X | $X | ... | $X | $XX |
| IVA a Pagar | $X | $X | ... | $X | $XX |
| ISR Retenido | $X | $X | ... | $X | $XX |
| Total de Pago | $X | $X | ... | $X | $XX |

### Vista Sueldos y Salarios (calculado desde facturas)
| Descripción | ENE | FEB | ... | DIC | ANUAL |
|-------------|-----|-----|-----|-----|-------|
| Total Ingresos | $X | $X | ... | $X | $XX |
| Total Egresos | $X | $X | ... | $X | $XX |
| Deducciones | $X | $X | ... | $X | $XX |
| ISR a Pagar | $X | $X | ... | $X | $XX |
| ISR Retenido | $X | $X | ... | $X | $XX |
| Total de Pago | $X | $X | ... | $X | $XX |

### Colores por Estatus
- 🟢 Verde: Presentada
- 🟡 Amarillo: Borrador / Calculado
- ⬜ Sin color: Sin declaración

### Interacción
- Celda vacía → Click abre modal "Nueva Declaración" con mes pre-seleccionado
- Celda con datos → Click abre detalle de la declaración

---

## 7. Perfiles y Permisos

| Módulo | Administrador | Contador | Auxiliar | Consulta |
|--------|:---:|:---:|:---:|:---:|
| Dashboard | RW | RW | R | R |
| Contribuyentes | RW | RW | R | R |
| Obligaciones | RW | RW | R | R |
| Calendario | RW | RW | R | R |
| e.firma/CSD | RW | RW | R | R |
| Expediente | RW | RW | R | - |
| Notas | RW | RW | R | - |
| Usuarios | RW | - | - | - |
| Respaldos | RW | - | - | - |
| Reportes | RW | RW | R | R |
| Facturas CFDI | RW | RW | R | - |
| Declaraciones | RW | RW | R | - |

R = Lectura | RW = Lectura/Escritura | - = Sin acceso

---

## 8. Notas de Desarrollo

### Decisiones Técnicas

1. **Bootstrap 5 en vez de CSS custom**: Se migró de CSS personalizado a Bootstrap 5 para mayor consistencia y mantenibilidad.

2. **Scripts inline en JavaScript puro**: Los scripts en páginas `.astro` usan `is:inline` con JavaScript vanilla (no TypeScript) porque `is:inline` no procesa TypeScript.

3. **Autenticación con bcrypt**: Password hasheado con bcryptjs. Login: `admin` / `admin`.

4. **SQLite local + Turso producción**: Desarrollo con `file:local.db`. Producción con Turso (variables de entorno `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`).

5. **Modal nativo de Bootstrap**: Se usa `bootstrap.Modal` en vez de modales custom para mejor integración.

6. **Adapter condicional**: `@astrojs/node` para desarrollo local, `@astrojs/netlify` para producción. Resuelve errores MIME y `__DEFINES__`.

7. **Clasificación por RFC**: Se usa el RFC del emisor/receptor para clasificar Ingreso/Egreso en vez de Uso CFDI, con excepciones para Nómina y Complemento de Pago.

8. **Cálculo on-the-fly**: El calendario de Sueldos y Salarios calcula directo de las facturas Nómina sin necesidad de guardar declaración primero.

### Pendiente antes de producción

- [x] Implementar bcrypt para contraseñas
- [x] Configurar Turso en producción
- [x] Migraciones SQL automáticas
- [ ] Agregar paginación a tablas
- [ ] Implementar roles y permisos reales
- [ ] Agregar validación RFC/CURP en tiempo real
- [ ] Optimizar imágenes y documentos
- [ ] Agregar tests unitarios
- [ ] Parseo completo de complemento de nómina (percepciones/deducciones)
- [ ] Captura manual de deducciones personales

---

## 9. Scripts de Base de Datos

### Seed y Migraciones
```bash
# Ejecutar seed (crea tablas + datos iniciales)
source .env && TURSO_DATABASE_URL="$TURSO_DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" npx tsx src/scripts/seed.ts

# Las migraciones se ejecutan automáticamente al correr el seed
# Migrations: 001, 002, 003, 004, 005
```

### Migraciones
| # | Archivo | Descripción |
|---|---------|-------------|
| 001 | 001_initial_schema.sql | 8 tablas base |
| 002 | 002_declaraciones.sql | Tabla declaraciones |
| 003 | 003_facturas_tipo_cfdi.sql | Columna tipo_cfdi en facturas |
| 004 | 004_fix_tipo_cfdi.sql | Clasificar CN01/CN02 como Nómina |
| 005 | 005_reclassify_facturas.sql | Reclassificar facturas por RFC |

---

## 10. Referencias

- [CFDI 4.0 SAT](http://www.sat.gob.mx/cfd/4)
- [Art. 113-E LISR (RESICO)](https://www.sat.gob.mx)
- [Art. 152 LISR (Sueldos y Salarios)](https://www.sat.gob.mx)
- [Art. 151 LISR (Deducciones Personales)](https://www.sat.gob.mx)
- [CFDI de Nómina 1.2](http://www.sat.gob.mx/cfd/nomina)
- [Astro JS Docs](https://docs.astro.build)
- [Turso Docs](https://docs.turso.tech)
- [Bootstrap 5](https://getbootstrap.com)

---

**Versión:** 3.0 (Actualizada)
**Última actualización:** Agosto 2026
