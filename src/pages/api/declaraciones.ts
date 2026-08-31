import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { calcularDeclaracionMensual, calcularDeclaracionAnual, calcularDeclaracionAnualSueldos } from '../../lib/calculations';

function generateId(): string {
  return crypto.randomUUID();
}

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  const contribuyenteId = url.searchParams.get('contribuyente_id');
  const tipo = url.searchParams.get('tipo');
  const anio = url.searchParams.get('anio');
  const action = url.searchParams.get('action');

  if (action === 'calcular') {
    const cId = contribuyenteId;
    const tipoCalc = tipo || 'Mensual';
    const anioNum = parseInt(anio || new Date().getFullYear().toString());
    const mesNum = parseInt(url.searchParams.get('mes') || (new Date().getMonth() + 1).toString());

    if (!cId) {
      return new Response(JSON.stringify({ error: 'contribuyente_id requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      let resultado;
      if (tipoCalc === 'Anual') {
        resultado = await calcularDeclaracionAnual(cId, anioNum);
      } else if (tipoCalc === 'Anual Sueldos') {
        resultado = await calcularDeclaracionAnualSueldos(cId, anioNum);
      } else {
        resultado = await calcularDeclaracionMensual(cId, mesNum, anioNum);
      }
      return new Response(JSON.stringify(resultado), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (id) {
    const result = await client.execute({
      sql: 'SELECT * FROM declaraciones WHERE id = ?',
      args: [id],
    });
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  let sql = 'SELECT * FROM declaraciones WHERE 1=1';
  const args: any[] = [];

  if (contribuyenteId) {
    sql += ' AND contribuyente_id = ?';
    args.push(contribuyenteId);
  }
  if (tipo) {
    sql += ' AND tipo = ?';
    args.push(tipo);
  }
  if (anio) {
    sql += ' AND periodo LIKE ?';
    args.push(anio + '%');
  }

  sql += ' ORDER BY periodo DESC';

  const result = await client.execute({ sql, args });
  return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const {
    contribuyente_id, tipo, periodo,
    total_ingresos, total_egresos,
    iva_trasladado, iva_acreditado, iva_retenido, iva_pagar,
    base_gravable_isr, tasa_isr, isr_retenido, isr_total, isr_por_pagar,
    notas,
  } = body;

  if (!contribuyente_id || !tipo || !periodo) {
    return new Response(JSON.stringify({ error: 'contribuyente_id, tipo y periodo son requeridos' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const id = generateId();

  await client.execute({
    sql: `INSERT INTO declaraciones (id, contribuyente_id, tipo, periodo,
      total_ingresos, total_egresos,
      iva_trasladado, iva_acreditado, iva_retenido, iva_pagar,
      base_gravable_isr, tasa_isr, isr_retenido, isr_total, isr_por_pagar,
      notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, contribuyente_id, tipo, periodo,
      total_ingresos || 0, total_egresos || 0,
      iva_trasladado || 0, iva_acreditado || 0, iva_retenido || 0, iva_pagar || 0,
      base_gravable_isr || 0, tasa_isr || 0, isr_retenido || 0, isr_total || 0, isr_por_pagar || 0,
      notas || null,
    ],
  });

  return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { id, estatus, fecha_presentacion, numero_operacion, notas } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const fields: string[] = [];
  const args: any[] = [];

  if (estatus !== undefined) { fields.push('estatus = ?'); args.push(estatus); }
  if (fecha_presentacion !== undefined) { fields.push('fecha_presentacion = ?'); args.push(fecha_presentacion); }
  if (numero_operacion !== undefined) { fields.push('numero_operacion = ?'); args.push(numero_operacion); }
  if (notas !== undefined) { fields.push('notas = ?'); args.push(notas); }

  fields.push("updated_at = datetime('now')");
  args.push(id);

  await client.execute({
    sql: `UPDATE declaraciones SET ${fields.join(', ')} WHERE id = ?`,
    args,
  });

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  await client.execute({ sql: 'DELETE FROM declaraciones WHERE id = ?', args: [id] });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
