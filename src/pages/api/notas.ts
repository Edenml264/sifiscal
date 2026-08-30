import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { generateId, sanitizeString } from '../../lib/validations';

const TIPOS_VALIDOS = ['Nota', 'Pendiente', 'Observación', 'Historial'];
const ESTATOS_VALIDOS = ['Activo', 'Completado', 'Cancelado'];

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    const contribuyenteId = url.searchParams.get('contribuyente_id') || '';
    const tipo = url.searchParams.get('tipo') || '';
    const estatus = url.searchParams.get('estatus') || '';

    if (id) {
      const result = await client.execute({
        sql: `SELECT n.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
              FROM notas n
              LEFT JOIN contribuyentes c ON n.contribuyente_id = c.id
              WHERE n.id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let sql = `SELECT n.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
               FROM notas n
               LEFT JOIN contribuyentes c ON n.contribuyente_id = c.id
               WHERE 1=1`;
    const args: any[] = [];

    if (contribuyenteId) {
      sql += ' AND n.contribuyente_id = ?';
      args.push(contribuyenteId);
    }
    if (tipo) {
      sql += ' AND n.tipo = ?';
      args.push(tipo);
    }
    if (estatus) {
      sql += ' AND n.estatus = ?';
      args.push(estatus);
    }

    sql += ' ORDER BY n.created_at DESC';

    const result = await client.execute({ sql, args });
    return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET notas error:', error);
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
    const { contribuyente_id, tipo, titulo, contenido, estatus } = data;

    if (!tipo || !titulo || !contenido) {
      return new Response(JSON.stringify({ error: 'Tipo, título y contenido son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return new Response(JSON.stringify({ error: 'Tipo no válido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = generateId();
    await client.execute({
      sql: `INSERT INTO notas (id, contribuyente_id, tipo, titulo, contenido, estatus)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        contribuyente_id || null,
        tipo,
        sanitizeString(titulo),
        sanitizeString(contenido),
        estatus || 'Activo',
      ],
    });

    return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('POST notas error:', error);
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
    const { id, contribuyente_id, tipo, titulo, contenido, estatus } = data;

    if (!id || !tipo || !titulo || !contenido) {
      return new Response(JSON.stringify({ error: 'ID, tipo, título y contenido son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!ESTATOS_VALIDOS.includes(estatus)) {
      return new Response(JSON.stringify({ error: 'Estatus no válido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await client.execute({
      sql: `UPDATE notas
            SET contribuyente_id = ?, tipo = ?, titulo = ?, contenido = ?, estatus = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        contribuyente_id || null,
        tipo,
        sanitizeString(titulo),
        sanitizeString(contenido),
        estatus,
        id,
      ],
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('PUT notas error:', error);
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

    await client.execute({ sql: 'DELETE FROM notas WHERE id = ?', args: [id] });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE notas error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
