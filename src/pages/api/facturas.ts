import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { generateId } from '../../lib/validations';
import { parseCFDI, clasificarMovimiento, esNomina } from '../../lib/xml-parser';

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
    const tipoMovimiento = clasificarMovimiento(cfdi.rfcEmisor, cfdi.rfcReceptor, rfc_usuario, cfdi.usoCFDI, cfdi.tipoCfdi);

    const existing = await client.execute({
      sql: 'SELECT id FROM facturas WHERE uuid = ?',
      args: [cfdi.uuid],
    });
    if (existing.rows.length > 0) {
      return new Response(JSON.stringify({ error: 'Esta factura ya fue registrada (UUID duplicado)' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = generateId();

    if (cfdi.tipoCfdi === 'ComplementoPago' && cfdi.cpUuidRelacionado) {
      await client.execute({
        sql: `INSERT INTO facturas (id, uuid, rfc_emisor, rfc_receptor, contribuyente_id, tipo_movimiento, metodo_pago, forma_pago, subtotal, iva_trasladado, iva_retenido, isr_retenido, total, fecha_emision, fecha_pago, fecha_timbrado, uso_cfdi, serie, folio, estatus, tipo_cfdi)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, cfdi.uuid || '', cfdi.rfcEmisor || '', cfdi.rfcReceptor || '',
          contribuyente_id, tipoMovimiento, cfdi.metodoPago || '', cfdi.formaPago || '',
          cfdi.subtotal || 0, cfdi.ivaTrasladado || 0, cfdi.ivaRetenido || 0, cfdi.isrRetenido || 0,
          cfdi.total || 0, cfdi.fechaEmision || '', cfdi.cpFechaPago || cfdi.fechaEmision || '',
          cfdi.fechaTimbrado || '', cfdi.usoCFDI || '', cfdi.serie || '', cfdi.folio || '',
          'pagada', 'ComplementoPago',
        ],
      });

      const original = await client.execute({
        sql: `UPDATE facturas SET fecha_pago = ?, estatus = 'pagada', updated_at = datetime('now')
              WHERE uuid = ? AND contribuyente_id = ? AND fecha_pago IS NULL`,
        args: [cfdi.cpFechaPago || cfdi.fechaEmision || '', cfdi.cpUuidRelacionado, contribuyente_id],
      });

      return new Response(JSON.stringify({
        success: true,
        id,
        tipo_movimiento: tipoMovimiento,
        tipo_cfdi: 'ComplementoPago',
        uuid: cfdi.uuid,
        total: cfdi.total,
        factura_original_actualizada: original.rowsAffected > 0,
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    const esPUE = cfdi.metodoPago === 'PUE';
    const tipoCfdiFinal = esNomina(cfdi.usoCFDI) ? 'Nomina' : (cfdi.tipoCfdi === 'ComplementoPago' ? 'ComplementoPago' : 'Ingreso');
    const args = [
      id,
      cfdi.uuid || '',
      cfdi.rfcEmisor || '',
      cfdi.rfcReceptor || '',
      contribuyente_id,
      tipoMovimiento,
      cfdi.metodoPago || '',
      cfdi.formaPago || '',
      cfdi.subtotal || 0,
      cfdi.ivaTrasladado || 0,
      cfdi.ivaRetenido || 0,
      cfdi.isrRetenido || 0,
      cfdi.total || 0,
      cfdi.fechaEmision || '',
      esPUE ? (cfdi.fechaEmision || '') : null,
      cfdi.fechaTimbrado || '',
      cfdi.usoCFDI || '',
      cfdi.serie || '',
      cfdi.folio || '',
      esPUE ? 'pagada' : 'pendiente',
      tipoCfdiFinal,
      cfdi.nominaSueldo || 0,
      cfdi.nominaAguinaldo || 0,
      cfdi.nominaPrimaVacacional || 0,
      cfdi.nominaPrimaDominical || 0,
      cfdi.nominaHorasExtra || 0,
      cfdi.nominaPTU || 0,
      cfdi.nominaOtrasPercepciones || 0,
      cfdi.nominaIMSS || 0,
      cfdi.nominaISR || 0,
      cfdi.nominaINFONAVIT || 0,
      cfdi.nominaSAR || 0,
      cfdi.nominaPensionAlimenticia || 0,
      cfdi.nominaOtrasDeducciones || 0,
      cfdi.nominaSubsidioAlEmpleo || 0,
    ];

    await client.execute({
      sql: `INSERT INTO facturas (id, uuid, rfc_emisor, rfc_receptor, contribuyente_id, tipo_movimiento, metodo_pago, forma_pago, subtotal, iva_trasladado, iva_retenido, isr_retenido, total, fecha_emision, fecha_pago, fecha_timbrado, uso_cfdi, serie, folio, estatus, tipo_cfdi,
            nomina_sueldo, nomina_aguinaldo, nomina_prima_vacacional, nomina_prima_dominical, nomina_horas_extra, nomina_ptu, nomina_otras_percepciones,
            nomina_imss, nomina_isr, nomina_infonavit, nomina_sar, nomina_pension_alimenticia, nomina_otras_deducciones, nomina_subsidio_empleo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args,
    });

    return new Response(JSON.stringify({
      success: true,
      id,
      tipo_movimiento: tipoMovimiento,
      tipo_cfdi: cfdi.tipoCfdi,
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

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const data = await request.json();
    const { id, tipo_movimiento, tipo_cfdi, uso_cfdi, estatus, metodo_pago, rfc_emisor, rfc_receptor } = data;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const fields: string[] = [];
    const args: any[] = [];

    if (tipo_movimiento !== undefined) { fields.push('tipo_movimiento = ?'); args.push(tipo_movimiento); }
    if (tipo_cfdi !== undefined) { fields.push('tipo_cfdi = ?'); args.push(tipo_cfdi); }
    if (uso_cfdi !== undefined) { fields.push('uso_cfdi = ?'); args.push(uso_cfdi); }
    if (estatus !== undefined) { fields.push('estatus = ?'); args.push(estatus); }
    if (metodo_pago !== undefined) { fields.push('metodo_pago = ?'); args.push(metodo_pago); }
    if (rfc_emisor !== undefined) { fields.push('rfc_emisor = ?'); args.push(rfc_emisor); }
    if (rfc_receptor !== undefined) { fields.push('rfc_receptor = ?'); args.push(rfc_receptor); }

    if (fields.length === 0) {
      return new Response(JSON.stringify({ error: 'Sin cambios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    fields.push("updated_at = datetime('now')");
    args.push(id);

    await client.execute({
      sql: `UPDATE facturas SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('PUT facturas error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
