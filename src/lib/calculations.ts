import { client } from './turso';

const UMA_ANUAL_2026 = 106567.56;
const TOPE_DEDUCCIONES = Math.min(UMA_ANUAL_2026 * 5, 0);
export interface KPIs {
  isrEstimado: number;
  ivaPagar: number;
  totalIngresos: number;
  totalEgresos: number;
  baseGravable: number;
  numFacturas: number;
}

export interface DeclaracionCalculada {
  total_ingresos: number;
  total_egresos: number;
  iva_trasladado: number;
  iva_acreditado: number;
  iva_retenido: number;
  iva_pagar: number;
  base_gravable_isr: number;
  tasa_isr: number;
  isr_retenido: number;
  isr_total: number;
  isr_por_pagar: number;
  num_facturas: number;
  tipo: string;
  periodo: string;
}

export interface DeclaracionSueldosCalculada extends DeclaracionCalculada {
  ingresos_acumulables: number;
  deducciones_personales: number;
  tope_deducciones: number;
  subsidio_empleo: number;
  isr_anual_bruto: number;
  isr_por_pagar_o_favor: number;
}

const TABLA_RESICO = [
  { limite: 25000, tasa: 0.01 },
  { limite: 50000, tasa: 0.014 },
  { limite: 83333, tasa: 0.0215 },
  { limite: 208333, tasa: 0.035 },
  { limite: 350000, tasa: 0.0475 },
  { limite: 450000, tasa: 0.0595 },
  { limite: Infinity, tasa: 0.064 },
];

const TABLA_ISR_ANUAL = [
  { limiteInferior: 0.01, cuotaFija: 0, tasa: 0.0192 },
  { limiteInferior: 348440.02, cuotaFija: 5920.04, tasa: 0.0640 },
  { limiteInferior: 580733.04, cuotaFija: 20770.96, tasa: 0.2136 },
  { limiteInferior: 1120041.06, cuotaFija: 135366.04, tasa: 0.2352 },
  { limiteInferior: 1294914.06, cuotaFija: 176430.56, tasa: 0.3000 },
  { limiteInferior: 1555895.06, cuotaFija: 254724.92, tasa: 0.3200 },
  { limiteInferior: 3111790.06, cuotaFija: 753371.32, tasa: 0.3400 },
  { limiteInferior: 4149053.06, cuotaFija: 1106400.72, tasa: 0.3500 },
];

const TABLA_SUBSIDIO_ANUAL = [
  { limiteInferior: 0.01, limiteSuperior: 108972.00, subsidio: 4881.96 },
  { limiteInferior: 108972.12, limiteSuperior: Infinity, subsidio: 0 },
];

export function obtenerTasaISR(baseGravableMensual: number): { tasa: number; cuotaFija: number } {
  for (const tramo of TABLA_RESICO) {
    if (baseGravableMensual <= tramo.limite) {
      return { tasa: tramo.tasa, cuotaFija: 0 };
    }
  }
  return { tasa: 0.064, cuotaFija: 0 };
}

function calcularISR(baseGravableMensual: number): { isrTotal: number; tasa: number } {
  const { tasa } = obtenerTasaISR(baseGravableMensual);
  return { isrTotal: baseGravableMensual * tasa, tasa };
}

function calcularISRAnual(baseGravable: number): { isr: number; tasa: number } {
  for (const tramo of TABLA_ISR_ANUAL) {
    if (baseGravable < tramo.limiteInferior) continue;
    const siguienteLimite = TABLA_ISR_ANUAL.find(t => t.limiteInferior > tramo.limiteInferior);
    if (!siguienteLimite || baseGravable <= siguienteLimite.limiteInferior - 0.01) {
      const excedente = baseGravable - tramo.limiteInferior;
      const isr = tramo.cuotaFija + (excedente * tramo.tasa);
      return { isr, tasa: tramo.tasa };
    }
  }
  const ultimo = TABLA_ISR_ANUAL[TABLA_ISR_ANUAL.length - 1];
  const excedente = baseGravable - ultimo.limiteInferior;
  return { isr: ultimo.cuotaFija + (excedente * ultimo.tasa), tasa: ultimo.tasa };
}

function calcularSubsidioAnual(ingresoAnual: number): number {
  for (const tramo of TABLA_SUBSIDIO_ANUAL) {
    if (ingresoAnual >= tramo.limiteInferior && ingresoAnual <= tramo.limiteSuperior) {
      return tramo.subsidio;
    }
  }
  return 0;
}

async function obtenerFacturasPeriodo(contribuyenteId: string, mes: number, anio: number) {
  const mesStr = mes.toString().padStart(2, '0');

  const ingresos = await client.execute({
    sql: `SELECT subtotal, iva_trasladado, iva_retenido, isr_retenido, total, fecha_pago FROM facturas
          WHERE contribuyente_id = ? AND tipo_movimiento = 'ingreso'
          AND tipo_cfdi NOT IN ('Nomina', 'ComplementoPago')
          AND uso_cfdi NOT IN ('D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', '010', 'CN01', 'CN02')
          AND fecha_pago IS NOT NULL
          AND strftime('%Y', fecha_pago) = ? AND strftime('%m', fecha_pago) = ?`,
    args: [contribuyenteId, anio.toString(), mesStr],
  });

  const egresos = await client.execute({
    sql: `SELECT subtotal, iva_trasladado, iva_retenido, isr_retenido, total, fecha_pago FROM facturas
          WHERE contribuyente_id = ? AND tipo_movimiento = 'egreso'
          AND tipo_cfdi NOT IN ('Nomina', 'ComplementoPago')
          AND uso_cfdi NOT IN ('D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', '010', 'CN01', 'CN02')
          AND fecha_pago IS NOT NULL
          AND strftime('%Y', fecha_pago) = ? AND strftime('%m', fecha_pago) = ?`,
    args: [contribuyenteId, anio.toString(), mesStr],
  });

  return { ingresos: ingresos.rows, egresos: egresos.rows };
}

async function obtenerNominaPeriodo(contribuyenteId: string, mes: number, anio: number) {
  const mesStr = mes.toString().padStart(2, '0');

  const nomina = await client.execute({
    sql: `SELECT subtotal, iva_trasladado, iva_retenido, isr_retenido, total, fecha_pago FROM facturas
          WHERE contribuyente_id = ? AND tipo_cfdi = 'Nomina'
          AND uso_cfdi IN ('CN01', 'CN02')
          AND fecha_pago IS NOT NULL
          AND strftime('%Y', fecha_pago) = ? AND strftime('%m', fecha_pago) = ?`,
    args: [contribuyenteId, anio.toString(), mesStr],
  });

  return nomina.rows;
}

export async function calcularDeclaracionMensual(
  contribuyenteId: string,
  mes: number,
  anio: number
): Promise<DeclaracionCalculada> {
  const { ingresos, egresos } = await obtenerFacturasPeriodo(contribuyenteId, mes, anio);

  const totalIngresos = ingresos.reduce((sum, r) => sum + (r.subtotal as number || 0), 0);
  const totalEgresos = egresos.reduce((sum, r) => sum + (r.subtotal as number || 0), 0);

  const ivaTrasladado = ingresos.reduce((sum, r) => sum + (r.iva_trasladado as number || 0), 0);
  const ivaAcreditado = egresos.reduce((sum, r) => sum + (r.iva_trasladado as number || 0), 0);
  const ivaRetenido = ingresos.reduce((sum, r) => sum + (r.iva_retenido as number || 0), 0);
  const ivaPagar = Math.max(0, ivaTrasladado - ivaAcreditado - ivaRetenido);

  const baseGravableISR = Math.max(0, totalIngresos - totalEgresos);
  const { isrTotal, tasa } = calcularISR(baseGravableISR);
  const isrRetenido = egresos.reduce((sum, r) => sum + (r.isr_retenido as number || 0), 0);
  const isrPorPagar = Math.max(0, isrTotal - isrRetenido);

  const mesStr = mes.toString().padStart(2, '0');

  return {
    total_ingresos: totalIngresos,
    total_egresos: totalEgresos,
    iva_trasladado: ivaTrasladado,
    iva_acreditado: ivaAcreditado,
    iva_retenido: ivaRetenido,
    iva_pagar: ivaPagar,
    base_gravable_isr: baseGravableISR,
    tasa_isr: tasa,
    isr_retenido: isrRetenido,
    isr_total: isrTotal,
    isr_por_pagar: isrPorPagar,
    num_facturas: ingresos.length + egresos.length,
    tipo: 'Mensual',
    periodo: anio + '-' + mesStr,
  };
}

export async function calcularDeclaracionAnual(
  contribuyenteId: string,
  anio: number
): Promise<DeclaracionCalculada> {
  let totalIngresos = 0;
  let totalEgresos = 0;
  let ivaTrasladado = 0;
  let ivaAcreditado = 0;
  let ivaRetenido = 0;
  let isrRetenido = 0;
  let numFacturas = 0;

  for (let mes = 1; mes <= 12; mes++) {
    const { ingresos, egresos } = await obtenerFacturasPeriodo(contribuyenteId, mes, anio);

    totalIngresos += ingresos.reduce((sum, r) => sum + (r.subtotal as number || 0), 0);
    totalEgresos += egresos.reduce((sum, r) => sum + (r.subtotal as number || 0), 0);
    ivaTrasladado += ingresos.reduce((sum, r) => sum + (r.iva_trasladado as number || 0), 0);
    ivaAcreditado += egresos.reduce((sum, r) => sum + (r.iva_trasladado as number || 0), 0);
    ivaRetenido += ingresos.reduce((sum, r) => sum + (r.iva_retenido as number || 0), 0);
    isrRetenido += egresos.reduce((sum, r) => sum + (r.isr_retenido as number || 0), 0);
    numFacturas += ingresos.length + egresos.length;
  }

  const ivaPagar = Math.max(0, ivaTrasladado - ivaAcreditado - ivaRetenido);
  const baseGravableISR = Math.max(0, totalIngresos - totalEgresos);
  const baseGravableMensual = baseGravableISR / 12;
  const { isrTotal, tasa } = calcularISR(baseGravableMensual);
  const isrTotalAnual = isrTotal * 12;
  const isrPorPagar = Math.max(0, isrTotalAnual - isrRetenido);

  return {
    total_ingresos: totalIngresos,
    total_egresos: totalEgresos,
    iva_trasladado: ivaTrasladado,
    iva_acreditado: ivaAcreditado,
    iva_retenido: ivaRetenido,
    iva_pagar: ivaPagar,
    base_gravable_isr: baseGravableISR,
    tasa_isr: tasa,
    isr_retenido: isrRetenido,
    isr_total: isrTotalAnual,
    isr_por_pagar: isrPorPagar,
    num_facturas: numFacturas,
    tipo: 'Anual',
    periodo: anio.toString(),
  };
}

export async function calcularDeclaracionAnualSueldos(
  contribuyenteId: string,
  anio: number
): Promise<DeclaracionSueldosCalculada> {
  let totalIngresos = 0;
  let isrRetenido = 0;
  let numFacturas = 0;

  for (let mes = 1; mes <= 12; mes++) {
    const nomina = await obtenerNominaPeriodo(contribuyenteId, mes, anio);
    totalIngresos += nomina.reduce((sum, r) => sum + (r.subtotal as number || 0), 0);
    isrRetenido += nomina.reduce((sum, r) => sum + (r.isr_retenido as number || 0), 0);
    numFacturas += nomina.length;
  }

  const deducciones = await client.execute({
    sql: `SELECT subtotal FROM facturas
          WHERE contribuyente_id = ?
          AND uso_cfdi IN ('D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', '010')
          AND tipo_cfdi NOT IN ('Nomina')
          AND fecha_pago IS NOT NULL
          AND strftime('%Y', fecha_pago) = ?`,
    args: [contribuyenteId, anio.toString()],
  });

  const totalDeducciones = deducciones.rows.reduce((sum, r) => sum + (r.subtotal as number || 0), 0);
  numFacturas += deducciones.rows.length;

  const topeDeducciones = Math.min(UMA_ANUAL_2026 * 5, totalIngresos * 0.15);
  const deduccionesAplicables = Math.min(totalDeducciones, topeDeducciones);

  const baseGravable = Math.max(0, totalIngresos - deduccionesAplicables);
  const { isr: isrAnualBruto, tasa } = calcularISRAnual(baseGravable);
  const subsidioEmpleo = calcularSubsidioAnual(totalIngresos);
  const isrNeto = Math.max(0, isrAnualBruto - subsidioEmpleo);
  const saldoAFavor = Math.max(0, subsidioEmpleo - isrAnualBruto);
  const isrPorPagarOavor = isrRetenido - isrNeto - saldoAFavor;

  return {
    total_ingresos: totalIngresos,
    total_egresos: 0,
    iva_trasladado: 0,
    iva_acreditado: 0,
    iva_retenido: 0,
    iva_pagar: 0,
    base_gravable_isr: baseGravable,
    tasa_isr: tasa,
    isr_retenido: isrRetenido,
    isr_total: isrNeto,
    isr_por_pagar: Math.max(0, isrPorPagarOavor),
    num_facturas: numFacturas,
    tipo: 'Anual Sueldos',
    periodo: anio.toString(),
    ingresos_acumulables: totalIngresos,
    deducciones_personales: deduccionesAplicables,
    tope_deducciones: topeDeducciones,
    subsidio_empleo: subsidioEmpleo,
    isr_anual_bruto: isrAnualBruto,
    isr_por_pagar_o_favor: isrPorPagarOavor,
  };
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
