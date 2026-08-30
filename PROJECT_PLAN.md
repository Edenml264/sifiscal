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
| 14 | Vista Centralizada Contribuyente | ✅ Completada | `contribuyentes/[id].astro` (5 tabs) |

### Pendientes Técnicos (Producción)

| # | Pendiente | Prioridad | Descripción |
|---|-----------|-----------|-------------|
| 1 | Paginación en más tablas | Media | Solo contribuyentes tiene paginación |
| 2 | Exportar a Excel | Baja | Descargar reportes en XLSX |

---

## 1. Stack Tecnológico

- **Framework**: Astro JS (SSR/Hybrid)
- **UI Framework**: Bootstrap 5.3.3
- **Base de Datos**: Turso (LibSQL/SQLite) - desarrollo local con `file:local.db`
- **Despliegue**: Netlify
- **Parser XML**: fast-xml-parser
- **Lenguaje**: TypeScript (server) / JavaScript puro (client-side inline scripts)
- **Almacenamiento local**: localStorage (respaldos del navegador)

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
- Parser de XML CFDI 4.0
- Clasificación automática (Ingreso vs Egreso)
- Cálculo de ISR e IVA

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

### Tabla: `documentos` ⏳
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

### Tabla: `notas` ⏳
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

### Tabla: `usuarios` ⏳
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

### Tabla: `facturas` ⏳
```sql
CREATE TABLE facturas (
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
```

### Tabla: `complementos_pago` ⏳
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

### Tabla: `respaldos` ⏳
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
- **Ingreso**: Cuando `rfc_receptor` == `rfc_usuario`
- **Egreso**: Cuando `rfc_emisor` == `rfc_usuario`

### 2. Cálculo de Impuestos según Método de Pago

#### PUE (Pago en Una Exhibición)
- El impuesto se cuenta al emitir el CFDI
- `fecha_pago = fecha_emision`
- Estatus se marca 'pagada' automáticamente

#### PPD (Pago en Parcialidades)
- El impuesto NO se cuenta hasta registrar el Complemento de Pago
- `fecha_pago = NULL` inicialmente
- Estatus permanece 'pendiente' hasta liquidar todos los pagos

### 3. Cálculo de ISR e IVA

#### ISR
- Base Gravable: Ingresos - Egresos
- Tasa RESICO: 1.5% - 2.5% (según tramo anual)

#### IVA
- IVA a Pagar: IVA Trasladado - IVA Acreditado

### 4. Régimen Fiscal 2026

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

---

## 5. Estructura de Carpetas (Actual)

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
│   │   │   └── [id].astro                 # Detalle ✅
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
│   │       ├── documentos.ts              # ⏳
│   │       ├── notas.ts                   # ⏳
│   │       ├── usuarios.ts                # ⏳
│   │       ├── respaldos.ts               # ⏳
│   │       ├── reportes.ts                # ⏳
│   │       └── upload-xml.ts              # ⏳
│   ├── lib/
│   │   ├── turso.ts                       # Cliente Turso ✅
│   │   ├── auth.ts                        # Autenticación ✅
│   │   ├── validations.ts                 # Validaciones ✅
│   │   ├── xml-parser.ts                  # Parser CFDI ✅ (lib)
│   │   └── calculations.ts                # Cálculos ISR/IVA ✅ (lib)
│   ├── components/
│   │   └── Sidebar.astro                  # Menú lateral ✅
│   ├── layouts/
│   │   ├── BaseLayout.astro               # Layout login ✅
│   │   └── DashboardLayout.astro          # Layout principal ✅
│   ├── middleware.ts                       # Auth middleware ✅
│   ├── scripts/
│   │   └── seed.ts                        # Inicialización DB ✅
│   └── styles/
│       └── global.css                     # Estilos sidebar ✅
├── db/
│   └── migrations/
│       └── 001_initial_schema.sql         # Todas las tablas ✅
├── prototype/
│   └── index.html                         # Prototipo HTML ✅
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── netlify.toml
├── .env.example
├── .gitignore
├── PROJECT_PLAN.md
└── README.md                              # ⏳
```

---

## 6. Perfiles y Permisos

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

R = Lectura | RW = Lectura/Escritura | - = Sin acceso

---

## 7. Notas de Desarrollo

### Decisiones Técnicas

1. **Bootstrap 5 en vez de CSS custom**: Se migró de CSS personalizado a Bootstrap 5 para mayor consistencia y mantenibilidad.

2. **Scripts inline en JavaScript puro**: Los scripts en páginas `.astro` usan `is:inline` con JavaScript vanilla (no TypeScript) porque `is:inline` no procesa TypeScript.

3. **Autenticación simple**: Password hasheado pendiente (actualmente texto plano en desarrollo). Usar bcrypt en producción.

4. **SQLite local**: Para desarrollo se usa `file:local.db`. En producción migrar a Turso con variables de entorno.

5. **Modal nativo de Bootstrap**: Se usa `bootstrap.Modal` en vez de modales custom para mejor integración.

### Pendiente antes de producción

- [ ] Implementar bcrypt para contraseñas
- [ ] Configurar Turso en producción
- [ ] Agregar paginación a tablas
- [ ] Implementar roles y permisos reales
- [ ] Agregar validación RFC/CURP en tiempo real
- [ ] Optimizar imágenes y documentos
- [ ] Agregar tests unitarios

---

## 8. Referencias

- [CFDI 4.0 SAT](http://www.sat.gob.mx/cfd/4)
- [Astro JS Docs](https://docs.astro.build)
- [Turso Docs](https://docs.turso.tech)
- [Bootstrap 5](https://getbootstrap.com)
- [RESICO 2026](https://www.sat.gob.mx)

---

**Versión:** 2.1 (Actualizada)
**Última actualización:** Agosto 2026
