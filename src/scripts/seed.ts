import { client } from '../lib/turso';
import { readFileSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

async function seed() {
  console.log('🚀 Inicializando base de datos SIFiscal...');

  // Run migrations
  const migration001 = readFileSync(join(process.cwd(), 'db/migrations/001_initial_schema.sql'), 'utf-8');
  for (const stmt of migration001.split(';').filter(s => s.trim())) {
    if (stmt.trim()) await client.execute(stmt.trim());
  }
  console.log('✅ Tablas creadas (001)');

  const migration002 = readFileSync(join(process.cwd(), 'db/migrations/002_declaraciones.sql'), 'utf-8');
  for (const stmt of migration002.split(';').filter(s => s.trim())) {
    if (stmt.trim()) await client.execute(stmt.trim());
  }
  console.log('✅ Tabla declaraciones creada (002)');

  const migration003 = readFileSync(join(process.cwd(), 'db/migrations/003_facturas_tipo_cfdi.sql'), 'utf-8');
  for (const stmt of migration003.split(';').filter(s => s.trim())) {
    if (stmt.trim()) await client.execute(stmt.trim());
  }
  console.log('✅ Columna tipo_cfdi agregada (003)');

  const migration005 = readFileSync(join(process.cwd(), 'db/migrations/005_reclassify_facturas.sql'), 'utf-8');
  for (const stmt of migration005.split(';').filter(s => s.trim())) {
    if (stmt.trim() && !stmt.trim().startsWith('--')) await client.execute(stmt.trim());
  }
  console.log('✅ Facturas reclasificadas (005)');

  const migration006 = readFileSync(join(process.cwd(), 'db/migrations/006_nomina_detalle.sql'), 'utf-8');
  for (const stmt of migration006.split(';').filter(s => s.trim())) {
    if (stmt.trim() && !stmt.trim().startsWith('--')) {
      try { await client.execute(stmt.trim()); } catch (e: any) { /* columna ya existe */ }
    }
  }
  console.log('✅ Columnas nómina detallada agregadas (006)');

  const migration007 = readFileSync(join(process.cwd(), 'db/migrations/007_obligaciones_pago.sql'), 'utf-8');
  for (const stmt of migration007.split(';').filter(s => s.trim())) {
    if (stmt.trim() && !stmt.trim().startsWith('--')) {
      try { await client.execute(stmt.trim()); } catch (e: any) { /* columna ya existe */ }
    }
  }
  console.log('✅ Columnas de pago en obligaciones agregadas (007)');

  // Reset admin user with bcrypt hashed password
  const adminId = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash('admin', SALT_ROUNDS);
  
  const existing = await client.execute({
    sql: `SELECT id FROM usuarios WHERE usuario = 'admin'`,
    args: [],
  });
  
  if (existing.rows.length > 0) {
    await client.execute({
      sql: `UPDATE usuarios SET password_hash = ? WHERE usuario = 'admin'`,
      args: [hashedPassword],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO usuarios (id, nombre, usuario, password_hash, perfil, permisos)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        adminId,
        'Administrador',
        'admin',
        hashedPassword,
        'Administrador',
        JSON.stringify({
          dashboard: 'RW',
          contribuyentes: 'RW',
          obligaciones: 'RW',
          calendario: 'RW',
          efirma: 'RW',
          expediente: 'RW',
          notas: 'RW',
          usuarios: 'RW',
          respaldos: 'RW',
          reportes: 'RW',
        }),
      ],
    });
  }
  console.log('✅ Usuario admin creado (admin/admin)');

  console.log('🎉 Base de datos inicializada correctamente');
}

seed().catch(console.error);
