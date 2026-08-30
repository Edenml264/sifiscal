import { client } from '../lib/turso';
import { readFileSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

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

  // Create default admin user with bcrypt hashed password
  const adminId = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash('admin', SALT_ROUNDS);
  
  await client.execute({
    sql: `INSERT OR IGNORE INTO usuarios (id, nombre, usuario, password_hash, perfil, permisos)
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
  console.log('✅ Usuario admin creado (admin/admin)');

  console.log('🎉 Base de datos inicializada correctamente');
}

seed().catch(console.error);
