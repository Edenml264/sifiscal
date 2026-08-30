import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { generateId, sanitizeString } from '../../lib/validations';

const CATEGORIAS_VALIDAS = [
  'Constancia de Situación Fiscal',
  'Opinión de Cumplimiento',
  'Acuse de Inscripción',
  'Avisos al RFC',
  'Poderes',
  'Identificaciones',
  'Otros',
];

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    const contribuyenteId = url.searchParams.get('contribuyente_id') || '';
    const categoria = url.searchParams.get('categoria') || '';

    if (id) {
      const result = await client.execute({
        sql: `SELECT d.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
              FROM documentos d
              JOIN contribuyentes c ON d.contribuyente_id = c.id
              WHERE d.id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      const doc = result.rows[0] as any;
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let sql = `SELECT d.id, d.nombre, d.categoria, d.tipo_archivo, d.created_at,
                      c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
               FROM documentos d
               JOIN contribuyentes c ON d.contribuyente_id = c.id
               WHERE 1=1`;
    const args: any[] = [];

    if (contribuyenteId) {
      sql += ' AND d.contribuyente_id = ?';
      args.push(contribuyenteId);
    }
    if (categoria) {
      sql += ' AND d.categoria = ?';
      args.push(categoria);
    }

    sql += ' ORDER BY d.created_at DESC';

    const result = await client.execute({ sql, args });
    return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET documentos error:', error);
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
    const { contribuyente_id, nombre, categoria, tipo_archivo, datos_base64 } = data;

    if (!contribuyente_id || !nombre || !categoria) {
      return new Response(JSON.stringify({ error: 'Contribuyente, nombre y categoría son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return new Response(JSON.stringify({ error: 'Categoría no válida' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = generateId();
    await client.execute({
      sql: `INSERT INTO documentos (id, contribuyente_id, nombre, categoria, tipo_archivo, datos_base64)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        contribuyente_id,
        sanitizeString(nombre),
        categoria,
        sanitizeString(tipo_archivo || ''),
        datos_base64 || '',
      ],
    });

    return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('POST documentos error:', error);
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

    await client.execute({ sql: 'DELETE FROM documentos WHERE id = ?', args: [id] });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE documentos error:', error);
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
    const { id, contribuyente_id, nombre, categoria, tipo_archivo, datos_base64 } = data;

    if (!id || !contribuyente_id || !nombre || !categoria) {
      return new Response(JSON.stringify({ error: 'ID, Contribuyente, nombre y categoría son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await client.execute({
      sql: `UPDATE documentos
            SET contribuyente_id = ?, nombre = ?, categoria = ?, tipo_archivo = ?, datos_base64 = ?
            WHERE id = ?`,
      args: [
        contribuyente_id,
        sanitizeString(nombre),
        categoria,
        sanitizeString(tipo_archivo || ''),
        datos_base64 || '',
        id,
      ],
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('PUT documentos error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
