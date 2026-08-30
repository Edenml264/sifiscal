import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { generateId } from '../../lib/validations';
import { parseCFDI, clasificarMovimiento } from '../../lib/xml-parser';

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    const contribuyenteId = url.searchParams.get('contribuyente_id') || '';
    const tipo = url.searchParams.get('tipo') || '';

    if (id) {
      const result = await client.execute({
        sql: `SELECT f.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
              FROM facturas f
              JOIN contribuyentes c ON f.contribuyente_id = c.id
              WHERE f.id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let sql = `SELECT f.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
               FROM facturas f
               JOIN contribuyentes c ON f.contribuyente_id = c.id
               WHERE 1=1`;
    const args: any[] = [];

    if (contribuyenteId) {
      sql += ' AND f.contribuyente_id = ?';
      args.push(contribuyenteId);
    }
    if (tipo) {
      sql += ' AND f.tipo_movimiento = ?';
      args.push(tipo);
    }

    sql += ' ORDER BY f.fecha_emision DESC';

    const result = await client.execute({ sql, args });
    return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET facturas error:', error);
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
    const { xml, contribuyente_id, rfc_usuario } = data;

    if (!xml || !contribuyente_id || !rfc_usuario) {
      return new Response(JSON.stringify({ error: 'XML, contribuyente y RFC son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const cfdi = parseCFDI(xml);
    const tipoMovimiento = clasificarMovimiento(cfdi.rfcEmisor, cfdi.rfcReceptor, rfc_usuario);

    const existing = await client.execute({
      sql: 'SELECT id FROM facturas WHERE uuid = ?',
      args: [cfdi.uuid],
    });
    if (existing.rows.length > 0) {
      return new Response(JSON.stringify({ error: 'Esta factura ya fue registrada (UUID duplicado)' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = generateId();
    await client.execute({
      sql: `INSERT INTO facturas (id, uuid, rfc_emisor, rfc_receptor, contribuyente_id, tipo_movimiento, metodo_pago, forma_pago, subtotal, iva_trasladado, iva_retenido, isr_retenido, total, fecha_emision, fecha_pago, fecha_timbrado, uso_cfdi, serie, folio, estatus)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        cfdi.uuid,
        cfdi.rfcEmisor,
        cfdi.rfcReceptor,
        contribuyente_id,
        tipoMovimiento,
        cfdi.metodoPago,
        cfdi.formaPago,
        cfdi.subtotal,
        cfdi.ivaTrasladado,
        cfdi.ivaRetenido,
        cfdi.isrRetenido,
        cfdi.total,
        cfdi.fechaEmision,
        cfdi.metodoPago === 'PUE' ? cfdi.fechaEmision : null,
        cfdi.fechaTimbrado,
        cfdi.usoCFDI,
        cfdi.serie,
        cfdi.folio,
        cfdi.metodoPago === 'PUE' ? 'pagada' : 'pendiente',
      ],
    });

    return new Response(JSON.stringify({
      success: true,
      id,
      tipo_movimiento: tipoMovimiento,
      uuid: cfdi.uuid,
      total: cfdi.total,
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('POST facturas error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error al procesar XML' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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

    await client.execute({ sql: 'DELETE FROM facturas WHERE id = ?', args: [id] });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE facturas error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
