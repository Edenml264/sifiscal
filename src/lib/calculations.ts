import { client } from './turso';

export interface KPIs {
  isrEstimado: number;
  ivaPagar: number;
  totalIngresos: number;
  totalEgresos: number;
  baseGravable: number;
  numFacturas: number;
}

export async function calcularKPIs(contribuyenteId: string, mes: number, anio: number): Promise<KPIs> {
  const mesStr = mes.toString().padStart(2, '0');

  const ingresos = await client.execute({
    sql: `SELECT subtotal, iva_trasladado, total FROM facturas
          WHERE contribuyente_id = ? AND tipo_movimiento = 'ingreso'
          AND fecha_pago IS NOT NULL
          AND strftime('%Y', fecha_pago) = ? AND strftime('%m', fecha_pago) = ?`,
    args: [contribuyenteId, anio.toString(), mesStr],
  });

  const egresos = await client.execute({
    sql: `SELECT subtotal, iva_trasladado, iva_retenido, isr_retenido, total FROM facturas
          WHERE contribuyente_id = ? AND tipo_movimiento = 'egreso'
          AND fecha_pago IS NOT NULL
          AND strftime('%Y', fecha_pago) = ? AND strftime('%m', fecha_pago) = ?`,
    args: [contribuyenteId, anio.toString(), mesStr],
  });

  const totalIngresos = ingresos.rows.reduce((sum, r) => sum + (r.total as number || 0), 0);
  const totalEgresos = egresos.rows.reduce((sum, r) => sum + (r.total as number || 0), 0);
  const ivaTrasladado = ingresos.rows.reduce((sum, r) => sum + (r.iva_trasladado as number || 0), 0);
  const ivaAcreditado = egresos.rows.reduce((sum, r) => sum + (r.iva_trasladado as number || 0), 0);

  const baseGravable = Math.max(0, totalIngresos - totalEgresos);
  const isrEstimado = baseGravable * 0.015;
  const ivaPagar = Math.max(0, ivaTrasladado - ivaAcreditado);

  return {
    isrEstimado,
    ivaPagar,
    totalIngresos,
    totalEgresos,
    baseGravable,
    numFacturas: ingresos.rows.length + egresos.rows.length,
  };
}

export async function calcularIVAMensual(rfcUsuario: string, mes: number, anio: number) {
  const mesStr = mes.toString().padStart(2, '0');

  const result = await client.execute({
    sql: `SELECT tipo_movimiento, SUM(iva_trasladado) as total_iva
          FROM facturas
          WHERE rfc_emisor = ? OR rfc_receptor = ?
          AND fecha_pago IS NOT NULL
          AND strftime('%Y', fecha_pago) = ? AND strftime('%m', fecha_pago) = ?
          GROUP BY tipo_movimiento`,
    args: [rfcUsuario, rfcUsuario, anio.toString(), mesStr],
  });

  let ivaTrasladado = 0;
  let ivaAcreditado = 0;

  result.rows.forEach(row => {
    if (row.tipo_movimiento === 'ingreso') ivaTrasladado = row.total_iva as number;
    if (row.tipo_movimiento === 'egreso') ivaAcreditado = row.total_iva as number;
  });

  return {
    ivaTrasladado,
    ivaAcreditado,
    ivaPagar: Math.max(0, ivaTrasladado - ivaAcreditado),
  };
}
