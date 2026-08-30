import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { validateRFC, validateCURP, validateEmail, sanitizeString, generateId } from '../../lib/validations';

const PAGE_SIZE = 10;

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    const search = url.searchParams.get('search') || '';
    const regimen = url.searchParams.get('regimen') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || String(PAGE_SIZE));
    const offset = (page - 1) * limit;

    if (id) {
      const result = await client.execute({
        sql: 'SELECT * FROM contribuyentes WHERE id = ?',
        args: [id],
      });
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let whereClause = 'WHERE 1=1';
    const args: any[] = [];

    if (search) {
      whereClause += ' AND (nombre LIKE ? OR rfc LIKE ?)';
      args.push(`%${search}%`, `%${search}%`);
    }
    if (regimen) {
      whereClause += ' AND regimen_fiscal = ?';
      args.push(regimen);
    }

    const countResult = await client.execute({
      sql: `SELECT COUNT(*) as total FROM contribuyentes ${whereClause}`,
      args: args,
    });
    const total = countResult.rows[0].total as number;

    const result = await client.execute({
      sql: `SELECT * FROM contribuyentes ${whereClause} ORDER BY nombre ASC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    return new Response(JSON.stringify({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET contribuyentes error:', error);
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
    const { nombre, rfc, curp, regimen_fiscal, domicilio, correo, telefono, contacto, estatus } = data;

    if (!nombre || !rfc || !regimen_fiscal) {
      return new Response(JSON.stringify({ error: 'Nombre, RFC y Régimen Fiscal son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!validateRFC(rfc)) {
      return new Response(JSON.stringify({ error: 'RFC con formato inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (curp && !validateCURP(curp)) {
      return new Response(JSON.stringify({ error: 'CURP con formato inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (correo && !validateEmail(correo)) {
      return new Response(JSON.stringify({ error: 'Correo con formato inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = generateId();
    await client.execute({
      sql: `INSERT INTO contribuyentes (id, nombre, rfc, curp, regimen_fiscal, domicilio, correo, telefono, contacto, estatus)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        sanitizeString(nombre),
        rfc.toUpperCase(),
        curp?.toUpperCase() || null,
        regimen_fiscal,
        sanitizeString(domicilio || ''),
        sanitizeString(correo || ''),
        sanitizeString(telefono || ''),
        sanitizeString(contacto || ''),
        estatus || 'Activo',
      ],
    });

    return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE')) {
      return new Response(JSON.stringify({ error: 'Ya existe un contribuyente con ese RFC' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
    console.error('POST contribuyentes error:', error);
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
    const { id, nombre, rfc, curp, regimen_fiscal, domicilio, correo, telefono, contacto, estatus } = data;

    if (!id || !nombre || !rfc || !regimen_fiscal) {
      return new Response(JSON.stringify({ error: 'ID, Nombre, RFC y Régimen Fiscal son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!validateRFC(rfc)) {
      return new Response(JSON.stringify({ error: 'RFC con formato inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (curp && !validateCURP(curp)) {
      return new Response(JSON.stringify({ error: 'CURP con formato inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (correo && !validateEmail(correo)) {
      return new Response(JSON.stringify({ error: 'Correo con formato inválido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await client.execute({
      sql: `UPDATE contribuyentes
            SET nombre = ?, rfc = ?, curp = ?, regimen_fiscal = ?, domicilio = ?,
                correo = ?, telefono = ?, contacto = ?, estatus = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        sanitizeString(nombre),
        rfc.toUpperCase(),
        curp?.toUpperCase() || null,
        regimen_fiscal,
        sanitizeString(domicilio || ''),
        sanitizeString(correo || ''),
        sanitizeString(telefono || ''),
        sanitizeString(contacto || ''),
        estatus || 'Activo',
        id,
      ],
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE')) {
      return new Response(JSON.stringify({ error: 'Ya existe otro contribuyente con ese RFC' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
    console.error('PUT contribuyentes error:', error);
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

    await client.execute({ sql: 'DELETE FROM contribuyentes WHERE id = ?', args: [id] });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE contribuyentes error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
