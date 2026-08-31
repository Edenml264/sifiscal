import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { calcularDeclaracionMensual, calcularDeclaracionAnual, calcularDeclaracionAnualSueldos } from '../../lib/calculations';

function calcularISRAnualLocal(baseGravable: number): number {
  const tabla = [
    { limiteInferior: 0.01, cuotaFija: 0, tasa: 0.0192 },
    { limiteInferior: 348440.02, cuotaFija: 5920.04, tasa: 0.0640 },
    { limiteInferior: 580733.04, cuotaFija: 20770.96, tasa: 0.2136 },
    { limiteInferior: 1120041.06, cuotaFija: 135366.04, tasa: 0.2352 },
    { limiteInferior: 1294914.06, cuotaFija: 176430.56, tasa: 0.3000 },
    { limiteInferior: 1555895.06, cuotaFija: 254724.92, tasa: 0.3200 },
    { limiteInferior: 3111790.06, cuotaFija: 753371.32, tasa: 0.3400 },
    { limiteInferior: 4149053.06, cuotaFija: 1106400.72, tasa: 0.3500 },
  ];
  for (const tramo of tabla) {
    if (baseGravable < tramo.limiteInferior) continue;
    const siguiente = tabla.find(t => t.limiteInferior > tramo.limiteInferior);
    if (!siguiente || baseGravable <= siguiente.limiteInferior - 0.01) {
      return tramo.cuotaFija + ((baseGravable - tramo.limiteInferior) * tramo.tasa);
    }
  }
  const ultimo = tabla[tabla.length - 1];
  return ultimo.cuotaFija + ((baseGravable - ultimo.limiteInferior) * ultimo.tasa);
}

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

  if (action === 'calendario') {
    const cId = contribuyenteId;
    const anioNum = parseInt(anio || new Date().getFullYear().toString());
    const tipoFiltro = url.searchParams.get('tipo_filtro') || '';

    if (!cId) {
      return new Response(JSON.stringify({ error: 'contribuyente_id requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const meses: Record<string, any> = {};
    for (let m = 1; m <= 12; m++) {
      const key = anioNum + '-' + m.toString().padStart(2, '0');
      meses[key] = { periodo: key, mes: m, declaracion: null };
    }

    if (tipoFiltro === 'Sueldos') {
      const UMA_ANUAL = 106567.56;
      for (let m = 1; m <= 12; m++) {
        const mesStr = m.toString().padStart(2, '0');
        const nomina = await client.execute({
          sql: `SELECT subtotal, isr_retenido FROM facturas
                WHERE contribuyente_id = ? AND tipo_cfdi = 'Nomina'
                AND uso_cfdi IN ('CN01', 'CN02')
                AND fecha_pago IS NOT NULL
                AND strftime('%Y', fecha_pago) = ? AND strftime('%m', fecha_pago) = ?`,
          args: [cId, anioNum.toString(), mesStr],
        });
        const deducciones = await client.execute({
          sql: `SELECT subtotal FROM facturas
                WHERE contribuyente_id = ?
                AND uso_cfdi IN ('D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', '010')
                AND tipo_cfdi NOT IN ('Nomina')
                AND fecha_pago IS NOT NULL
                AND strftime('%Y', fecha_pago) = ? AND strftime('%m', fecha_pago) = ?`,
          args: [cId, anioNum.toString(), mesStr],
        });

        const totalIngresos = nomina.rows.reduce((s, r) => s + (r.subtotal as number || 0), 0);
        const isrRetenido = nomina.rows.reduce((s, r) => s + (r.isr_retenido as number || 0), 0);
        const totalDeducciones = deducciones.rows.reduce((s, r) => s + (r.subtotal as number || 0), 0);
        const numFacturas = nomina.rows.length;

        if (numFacturas > 0) {
          const topeDed = Math.min(UMA_ANUAL * 5, totalIngresos * 0.15);
          const dedAplicables = Math.min(totalDeducciones, topeDed);
          const baseGravable = Math.max(0, totalIngresos - dedAplicables);
          const isrAnual = calcularISRAnualLocal(baseGravable);
          const subsidio = totalIngresos <= 108972 ? 4881.96 : 0;
          const isrNeto = Math.max(0, isrAnual - subsidio);
          const isrPorPagar = isrNeto - isrRetenido;

          const key = anioNum + '-' + mesStr;
          meses[key].declaracion = {
            id: null,
            tipo: 'Anual Sueldos',
            estatus: 'Calculado',
            total_ingresos: totalIngresos,
            total_egresos: 0,
            isr_por_pagar: Math.max(0, isrPorPagar),
            iva_pagar: 0,
            isr_retenido: isrRetenido,
            base_gravable_isr: baseGravable,
          };
        }
      }
    } else {
      let sql = `SELECT * FROM declaraciones
            WHERE contribuyente_id = ?
            AND periodo LIKE ?`;
      const args: any[] = [cId, anioNum + '%'];

      if (tipoFiltro === 'RESICO') {
        sql += ` AND tipo IN ('Mensual', 'Anual')`;
      }
      sql += ` ORDER BY periodo ASC`;

      const result = await client.execute({ sql, args });

      for (const row of result.rows) {
        const p = row.periodo as string;
        if (meses[p]) {
          meses[p].declaracion = {
            id: row.id,
            tipo: row.tipo,
            estatus: row.estatus,
            total_ingresos: row.total_ingresos || 0,
            total_egresos: row.total_egresos || 0,
            isr_por_pagar: row.isr_por_pagar || 0,
            iva_pagar: row.iva_pagar || 0,
            isr_retenido: row.isr_retenido || 0,
            base_gravable_isr: row.base_gravable_isr || 0,
          };
        }
      }
    }

    let totalIngresos = 0, totalEgresos = 0;
    let totalISR = 0, totalIVA = 0, totalRetenido = 0;

    for (const m of Object.values(meses)) {
      if (m.declaracion) {
        totalIngresos += m.declaracion.total_ingresos || 0;
        totalEgresos += m.declaracion.total_egresos || 0;
        totalISR += m.declaracion.isr_por_pagar || 0;
        totalIVA += m.declaracion.iva_pagar || 0;
        totalRetenido += m.declaracion.isr_retenido || 0;
      }
    }

    const mesesArray = Object.values(meses);

    return new Response(JSON.stringify({
      anio: anioNum,
      tipo_filtro: tipoFiltro,
      meses: mesesArray,
      anual: {
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        isr_por_pagar: totalISR,
        iva_pagar: totalIVA,
        isr_retenido: totalRetenido,
        total_pagar: totalISR + totalIVA,
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
