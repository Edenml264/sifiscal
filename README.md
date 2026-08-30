# SIFiscal - Sistema de Control Fiscal para México

Sistema profesional de control fiscal para contadores mexicanos. Gestiona múltiples contribuyentes (RFC), obligaciones fiscales, calendarios de cumplimiento y documentos en un solo lugar.

---

## ¿Qué es SIFiscal?

SIFiscal es una aplicación web diseñada para contadores y profesionales fiscales en México. Permite:

- **Gestionar múltiples contribuyentes** en una sola cuenta
- **Controlar obligaciones fiscales** (ISR, IVA, retenciones, etc.)
- **Calendario fiscal** con recordatorios automáticos
- **Control de e.firma y CSD** con alertas de vencimiento
- **Expediente digital** para documentos oficiales
- **Reportes** listos para imprimir en PDF

### ¿Para quién es?

- Contadores públicos que atienden múltiples clientes
- Despachos contables
- Personas físicas con actividad empresarial
- Empresas que manejan su propia contabilidad

---

## Capturas de Pantalla

<!-- Agregar capturas aquí -->
![Dashboard](docs/dashboard.png)
![Calendario](docs/calendario.png)
![Contribuyentes](docs/contribuyentes.png)

---

## Instalación Rápida

### Requisitos

- Node.js 18+ (recomendado: 20 LTS)
- npm o yarn

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/sifiscal.git
cd sifiscal

# 2. Instalar dependencias
npm install

# 3. Inicializar la base de datos con datos de prueba
npx tsx src/scripts/seed.ts

# 4. Iniciar servidor de desarrollo
npm run dev

# 5. Abrir en navegador
open http://localhost:4321
```

### Credenciales de Prueba

| Usuario | Contraseña |
|---------|------------|
| admin   | admin      |

---

## Uso del Sistema

### Iniciar Sesión

Ingresa tu usuario y contraseña en la pantalla de login.

### Dashboard

Pantalla principal con resumen de:
- Total de contribuyentes
- Obligaciones próximas a vencer
- Obligaciones vencidas
- e.firmas y CSD por vencer
- Alertas importantes

### Módulos

#### Contribuyentes
- Alta, baja, edición y consulta
- Registro de RFC, CURP, régimen fiscal
- 16 regímenes fiscales válidos para 2026
- Búsqueda por nombre o RFC

#### Obligaciones Fiscales
- ISR, IVA, Retenciones
- Declaraciones mensuales y anuales
- DIOT, informativas
- Filtros por contribuyente, estatus y tipo
- Registro de número de operación

#### Calendario Fiscal
- Vista mensual tipo Google Calendar
- Colores por estatus: ✅ Presentada, ⚠️ Pendiente, ❌ Vencida
- Navegación entre meses
- Click en día para ver detalle

#### e.firma y CSD
- Control de e.firma electrónica
- Certificados de Sello Digital (CSD)
- Alertas automáticas de vencimiento
- Días restantes calculados automáticamente

#### Expediente Digital (próximamente)
- Subir documentos PDF, JPG, PNG
- Categorizar: Constancia, Opinión de Cumplimiento, etc.
- Almacenamiento seguro en base de datos

#### Notas y Seguimiento (próximamente)
- Notas por contribuyente
- Pendientes y tareas
- Historial de actividades

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Framework | Astro JS |
| UI | Bootstrap 5.3.3 |
| Base de Datos | Turso (SQLite) |
| Despliegue | Netlify |
| Parser XML | fast-xml-parser |
| Lenguaje | TypeScript (server) |

---

## Estructura del Proyecto

```
sifiscal/
├── src/
│   ├── pages/           # Páginas y API endpoints
│   ├── lib/             # Utilidades y lógica de negocio
│   ├── components/      # Componentes Astro
│   ├── layouts/         # Layouts (BaseLayout, DashboardLayout)
│   ├── middleware.ts     # Middleware de autenticación
│   ├── scripts/         # Scripts de inicialización
│   └── styles/          # Estilos CSS
├── db/
│   └── migrations/      # Migraciones SQL
├── prototype/           # Prototipo HTML de referencia
├── astro.config.mjs     # Configuración de Astro
├── netlify.toml         # Configuración de Netlify
└── .env                 # Variables de entorno
```

---

## API Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/logout` | Cerrar sesión |

### Datos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard` | KPIs del dashboard |
| GET/POST/PUT/DELETE | `/api/contribuyentes` | CRUD contribuyentes |
| GET/POST/PUT/DELETE | `/api/obligaciones` | CRUD obligaciones |
| GET | `/api/calendario` | Datos del calendario por mes |
| GET/POST/PUT/DELETE | `/api/efirma` | CRUD e.firma/CSD |

---

## Base de Datos

### Tablas Principales

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| contribuyentes | - | Datos fiscales de cada RFC |
| obligaciones_fiscales | - | ISR, IVA, retenciones, etc. |
| efirma_csd | - | e.firmas y Certificados de Sello Digital |
| documentos | - | Expediente digital |
| notas | - | Notas y seguimiento |
| usuarios | - | Usuarios del sistema |
| facturas | - | Facturas CFDI 4.0 |
| complementos_pago | - | Complementos de pago (PPD) |
| respaldos | - | Historial de respaldos |

---

## Módulos Implementados

- [x] Autenticación y control de acceso
- [x] Dashboard con KPIs
- [x] Gestión de contribuyentes
- [x] Obligaciones fiscales
- [x] Calendario fiscal
- [x] Control de e.firma y CSD
- [x] Sidebar y navegación

## Módulos Pendientes

- [ ] Expediente digital
- [ ] Notas y seguimiento
- [ ] Usuarios y permisos
- [ ] Respaldos
- [ ] Reportes PDF
- [ ] Procesador XML CFDI 4.0

---

## Desarrollo

### Comandos Disponibles

```bash
npm run dev          # Servidor de desarrollo (puerto 4321)
npm run build        # Construir para producción
npm run preview      # Previsualizar build
npx tsx src/scripts/seed.ts  # Inicializar DB
```

### Agregar un Módulo Nuevo

1. Crear tabla SQL en `db/migrations/`
2. Crear endpoint API en `src/pages/api/`
3. Crear página en `src/pages/`
4. Agregar enlace en `Sidebar.astro`
5. Ejecutar `seed.ts` si se modificó la BD

### Variables de Entorno

```env
# Desarrollo (local.db)
TURSO_DATABASE_URL=file:local.db

# Producción (Turso)
TURSO_DATABASE_URL=libsql://tu-base.turso.io
TURSO_AUTH_TOKEN=tu-token-aqui
```

---

## Despliegue en Netlify

1. Conectar repositorio a Netlify
2. Configurar variables de entorno:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
3. Build command: `npm run build`
4. Publish directory: `dist`

---

## Próximos Pasos

1. Implementar bcrypt para contraseñas
2. Configurar Turso en producción
3. Completar módulos pendientes
4. Agregar tests unitarios
5. Optimizar rendimiento

---

## Licencia

MIT © 2026

---

## Contacto

- **Autor**: Eden Méndez
- **Email**: [tu-email@ejemplo.com]
- **GitHub**: [https://github.com/tu-usuario]
