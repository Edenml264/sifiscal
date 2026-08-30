import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { generateId, sanitizeString } from '../../lib/validations';

const TIPOS_VALIDOS = [
  'ISR', 'IVA', 'Retenciones', 'Declaración Mensual', 'Declaración Anual',
  'DIOT', 'Informativas', 'Avisos al RFC', 'Contabilidad Electrónica', 'Otras'
];

const ESTATOS_VALIDOS = ['Pendiente', 'Presentada', 'Vencida', 'No Aplica'];

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
        sql: `SELECT o.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
              FROM obligaciones_fiscales o
              JOIN contribuyentes c ON o.contribuyente_id = c.id
              WHERE o.id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'No encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let sql = `SELECT o.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
               FROM obligaciones_fiscales o
               JOIN contribuyentes c ON o.contribuyente_id = c.id
               WHERE 1=1`;
    const args: any[] = [];

    if (contribuyenteId) {
      sql += ' AND o.contribuyente_id = ?';
      args.push(contribuyenteId);
    }
    if (tipo) {
      sql += ' AND o.tipo = ?';
      args.push(tipo);
    }
    if (estatus) {
      sql += ' AND o.estatus = ?';
      args.push(estatus);
    }

    sql += ' ORDER BY o.fecha_vencimiento ASC';

    const result = await client.execute({ sql, args });
    return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET obligaciones error:', error);
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
    const { contribuyente_id, tipo, periodo, fecha_vencimiento, estatus, fecha_presentacion, numero_operacion, notas } = data;

    if (!contribuyente_id || !tipo || !fecha_vencimiento) {
      return new Response(JSON.stringify({ error: 'Contribuyente, tipo y fecha de vencimiento son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return new Response(JSON.stringify({ error: 'Tipo de obligación no válido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = generateId();
    await client.execute({
      sql: `INSERT INTO obligaciones_fiscales (id, contribuyente_id, tipo, periodo, fecha_vencimiento, estatus, fecha_presentacion, numero_operacion, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        contribuyente_id,
        tipo,
        sanitizeString(periodo || ''),
        fecha_vencimiento,
        estatus || 'Pendiente',
        fecha_presentacion || null,
        sanitizeString(numero_operacion || ''),
        sanitizeString(notas || ''),
      ],
    });

    return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('POST obligaciones error:', error);
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
    const { id, contribuyente_id, tipo, periodo, fecha_vencimiento, estatus, fecha_presentacion, numero_operacion, notas } = data;

    if (!id || !contribuyente_id || !tipo || !fecha_vencimiento) {
      return new Response(JSON.stringify({ error: 'ID, Contribuyente, tipo y vencimiento son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await client.execute({
      sql: `UPDATE obligaciones_fiscales
            SET contribuyente_id = ?, tipo = ?, periodo = ?, fecha_vencimiento = ?,
                estatus = ?, fecha_presentacion = ?, numero_operacion = ?, notas = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        contribuyente_id,
        tipo,
        sanitizeString(periodo || ''),
        fecha_vencimiento,
        estatus || 'Pendiente',
        fecha_presentacion || null,
        sanitizeString(numero_operacion || ''),
        sanitizeString(notas || ''),
        id,
      ],
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('PUT obligaciones error:', error);
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

    await client.execute({ sql: 'DELETE FROM obligaciones_fiscales WHERE id = ?', args: [id] });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE obligaciones error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
