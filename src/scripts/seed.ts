import { client } from '../lib/turso';
import { readFileSync } from 'fs';
import { join } from 'path';

async function seed() {
  console.log('🚀 Inicializando base de datos SIFiscal...');

  // Run migration
  const migration = readFileSync(join(process.cwd(), 'db/migrations/001_initial_schema.sql'), 'utf-8');
  const statements = migration.split(';').filter(s => s.trim());

  for (const stmt of statements) {
    if (stmt.trim()) {
      await client.execute(stmt.trim());
    }
  }
  console.log('✅ Tablas creadas');

  // Create default admin user
  const adminId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT OR IGNORE INTO usuarios (id, nombre, usuario, password_hash, perfil, permisos)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      adminId,
      'Administrador',
      'admin',
      'admin', // In production, hash this with bcrypt
      'Administrador',
      JSON.stringify([
        'Dashboard:read:write',
        'Contribuyentes:read:write',
        'Obligaciones:read:write',
        'Calendario:read:write',
        'e.firma y CSD:read:write',
        'Expediente:read:write',
        'Notas:read:write',
        'Usuarios:read:write',
        'Respaldos:read:write',
        'Reportes:read:write',
      ]),
    ],
  });
  console.log('✅ Usuario admin creado (admin/admin)');

  console.log('🎉 Base de datos inicializada correctamente');
}

seed().catch(console.error);
