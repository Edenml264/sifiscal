import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { generateId, sanitizeString } from '../../lib/validations';
import { createHash } from 'crypto';

const PERFILES_VALIDOS = ['Administrador', 'Contador', 'Auxiliar', 'Consulta'];

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    const perfil = url.searchParams.get('perfil') || '';

    if (id) {
      const result = await client.execute({
        sql: `SELECT id, nombre, usuario, perfil, permisos, created_at, updated_at FROM usuarios WHERE id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let sql = `SELECT id, nombre, usuario, perfil, permisos, created_at, updated_at FROM usuarios WHERE 1=1`;
    const args: any[] = [];

    if (perfil) {
      sql += ' AND perfil = ?';
      args.push(perfil);
    }

    sql += ' ORDER BY nombre ASC';

    const result = await client.execute({ sql, args });
    return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET usuarios error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const data = await request.json();
    const { nombre, usuario, password, perfil, permisos } = data;

    if (!nombre || !usuario || !password || !perfil) {
      return new Response(JSON.stringify({ error: 'Nombre, usuario, contraseña y perfil son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!PERFILES_VALIDOS.includes(perfil)) {
      return new Response(JSON.stringify({ error: 'Perfil no válido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const existing = await client.execute({
      sql: 'SELECT id FROM usuarios WHERE usuario = ?',
      args: [usuario],
    });
    if (existing.rows.length > 0) {
      return new Response(JSON.stringify({ error: 'El usuario ya existe' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = generateId();
    const passwordHash = hashPassword(password);

    const defaultPermisos = JSON.stringify({
      dashboard: 'R',
      contribuyentes: 'R',
      obligaciones: 'R',
      calendario: 'R',
      efirma: 'R',
      expediente: 'R',
      notas: 'R',
      usuarios: '-',
      respaldos: '-',
      reportes: 'R',
    });

    await client.execute({
      sql: `INSERT INTO usuarios (id, nombre, usuario, password_hash, perfil, permisos)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        sanitizeString(nombre),
        sanitizeString(usuario),
        passwordHash,
        perfil,
        permisos || defaultPermisos,
      ],
    });

    return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('POST usuarios error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const data = await request.json();
    const { id, nombre, usuario, password, perfil, permisos } = data;

    if (!id || !nombre || !usuario || !perfil) {
      return new Response(JSON.stringify({ error: 'ID, nombre, usuario y perfil son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const existing = await client.execute({
      sql: 'SELECT id FROM usuarios WHERE usuario = ? AND id != ?',
      args: [usuario, id],
    });
    if (existing.rows.length > 0) {
      return new Response(JSON.stringify({ error: 'El usuario ya existe' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let sql: string;
    let args: any[];

    if (password) {
      sql = `UPDATE usuarios
             SET nombre = ?, usuario = ?, password_hash = ?, perfil = ?, permisos = ?,
                 updated_at = datetime('now')
             WHERE id = ?`;
      args = [
        sanitizeString(nombre),
        sanitizeString(usuario),
        hashPassword(password),
        perfil,
        permisos || '{}',
        id,
      ];
    } else {
      sql = `UPDATE usuarios
             SET nombre = ?, usuario = ?, perfil = ?, permisos = ?,
                 updated_at = datetime('now')
             WHERE id = ?`;
      args = [
        sanitizeString(nombre),
        sanitizeString(usuario),
        perfil,
        permisos || '{}',
        id,
      ];
    }

    await client.execute({ sql, args });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('PUT usuarios error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (id === user.id) {
      return new Response(JSON.stringify({ error: 'No puedes eliminar tu propio usuario' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await client.execute({ sql: 'DELETE FROM usuarios WHERE id = ?', args: [id] });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE usuarios error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
