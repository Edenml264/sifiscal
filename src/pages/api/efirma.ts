import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { generateId, sanitizeString } from '../../lib/validations';

const TIPOS_VALIDOS = ['e.firma', 'CSD'];
const ESTATOS_VALIDOS = ['Vigente', 'Por Renovar', 'Vencida'];

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    const tipo = url.searchParams.get('tipo') || '';
    const contribuyenteId = url.searchParams.get('contribuyente_id') || '';

    if (id) {
      const result = await client.execute({
        sql: `SELECT e.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
              FROM efirma_csd e
              JOIN contribuyentes c ON e.contribuyente_id = c.id
              WHERE e.id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let sql = `SELECT e.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
               FROM efirma_csd e
               JOIN contribuyentes c ON e.contribuyente_id = c.id
               WHERE 1=1`;
    const args: any[] = [];

    if (tipo) {
      sql += ' AND e.tipo = ?';
      args.push(tipo);
    }
    if (contribuyenteId) {
      sql += ' AND e.contribuyente_id = ?';
      args.push(contribuyenteId);
    }

    sql += ' ORDER BY e.fecha_vencimiento ASC';

    const result = await client.execute({ sql, args });
    return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET efirma error:', error);
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
    const { contribuyente_id, tipo, folio, fecha_emision, fecha_vencimiento, estatus, notas } = data;

    if (!contribuyente_id || !tipo || !fecha_emision || !fecha_vencimiento) {
      return new Response(JSON.stringify({ error: 'Contribuyente, tipo, emisión y vencimiento son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return new Response(JSON.stringify({ error: 'Tipo no válido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = generateId();
    await client.execute({
      sql: `INSERT INTO efirma_csd (id, contribuyente_id, tipo, folio, fecha_emision, fecha_vencimiento, estatus, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        contribuyente_id,
        tipo,
        sanitizeString(folio || ''),
        fecha_emision,
        fecha_vencimiento,
        estatus || 'Vigente',
        sanitizeString(notas || ''),
      ],
    });

    return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('POST efirma error:', error);
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
    const { id, contribuyente_id, tipo, folio, fecha_emision, fecha_vencimiento, estatus, notas } = data;

    if (!id || !contribuyente_id || !tipo || !fecha_emision || !fecha_vencimiento) {
      return new Response(JSON.stringify({ error: 'ID, Contribuyente, tipo, emisión y vencimiento son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await client.execute({
      sql: `UPDATE efirma_csd
            SET contribuyente_id = ?, tipo = ?, folio = ?, fecha_emision = ?,
                fecha_vencimiento = ?, estatus = ?, notas = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        contribuyente_id,
        tipo,
        sanitizeString(folio || ''),
        fecha_emision,
        fecha_vencimiento,
        estatus || 'Vigente',
        sanitizeString(notas || ''),
        id,
      ],
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('PUT efirma error:', error);
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

    await client.execute({ sql: 'DELETE FROM efirma_csd WHERE id = ?', args: [id] });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE efirma error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
