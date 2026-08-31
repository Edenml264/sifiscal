import { XMLParser } from 'fast-xml-parser';

export interface CFDIData {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  metodoPago: string;
  formaPago: string;
  subtotal: number;
  ivaTrasladado: number;
  ivaRetenido: number;
  isrRetenido: number;
  total: number;
  fechaEmision: string;
  fechaTimbrado: string;
  usoCFDI: string;
  serie: string;
  folio: string;
  tipoCfdi: string;
  nominaTipo?: string;
  nominaPercepciones?: number;
  nominaDeducciones?: number;
  nominaSueldo?: number;
  nominaAguinaldo?: number;
  nominaPrimaVacacional?: number;
  nominaPrimaDominical?: number;
  nominaHorasExtra?: number;
  nominaPTU?: number;
  nominaOtrasPercepciones?: number;
  nominaIMSS?: number;
  nominaISR?: number;
  nominaINFONAVIT?: number;
  nominaSAR?: number;
  nominaPensionAlimenticia?: number;
  nominaOtrasDeducciones?: number;
  nominaSubsidioAlEmpleo?: number;
  cpUuidRelacionado?: string;
  cpFechaPago?: string;
  cpMontoPago?: number;
}

function extractIVATrasladado(cfdi: any): number {
  const traslados = cfdi['cfdi:Impuestos']?.['cfdi:Traslados']?.['cfdi:Traslado'];
  if (!traslados) return 0;
  const arr = Array.isArray(traslados) ? traslados : [traslados];
  const iva = arr.find((t: any) => t['@_Impuesto'] === '002');
  const val = iva ? parseFloat(iva['@_Importe']) : 0;
  return isNaN(val) ? 0 : val;
}

function extractIVARetenido(cfdi: any): number {
  const retenciones = cfdi['cfdi:Impuestos']?.['cfdi:Retenciones']?.['cfdi:Retencion'];
  if (!retenciones) return 0;
  const arr = Array.isArray(retenciones) ? retenciones : [retenciones];
  const iva = arr.find((r: any) => r['@_Impuesto'] === '002');
  const val = iva ? parseFloat(iva['@_Importe']) : 0;
  return isNaN(val) ? 0 : val;
}

function extractISRRetenido(cfdi: any): number {
  const retenciones = cfdi['cfdi:Impuestos']?.['cfdi:Retenciones']?.['cfdi:Retencion'];
  if (!retenciones) return 0;
  const arr = Array.isArray(retenciones) ? retenciones : [retenciones];
  const isr = arr.find((r: any) => r['@_Impuesto'] === '001');
  const val = isr ? parseFloat(isr['@_Importe']) : 0;
  return isNaN(val) ? 0 : val;
}

function safeFloat(val: any): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function parseCFDI(xmlContent: string): CFDIData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const result = parser.parse(xmlContent);
  const cfdi = result['cfdi:Comprobante'];
  const emisor = cfdi['cfdi:Emisor'];
  const receptor = cfdi['cfdi:Receptor'];
  const complemento = cfdi['cfdi:Complemento'];
  const timbre = complemento?.['tfd:TimbreFiscalDigital'];

  if (!timbre) {
    throw new Error('No se encontró el timbre fiscal digital (TimbreFiscalDigital) en el XML');
  }

  let tipoCfdi = 'Ingreso';
  let nominaTipo: string | undefined;
  let nominaPercepciones: number | undefined;
  let nominaDeducciones: number | undefined;
  let nominaSueldo = 0, nominaAguinaldo = 0, nominaPrimaVacacional = 0;
  let nominaPrimaDominical = 0, nominaHorasExtra = 0, nominaPTU = 0, nominaOtrasPercepciones = 0;
  let nominaIMSS = 0, nominaISR = 0, nominaINFONAVIT = 0, nominaSAR = 0;
  let nominaPensionAlimenticia = 0, nominaOtrasDeducciones = 0, nominaSubsidioAlEmpleo = 0;
  let cpUuidRelacionado: string | undefined;
  let cpFechaPago: string | undefined;
  let cpMontoPago: number | undefined;

  if (complemento) {
    const nomina12 = complemento['nomina12:Nomina'];
    const nomina11 = complemento['nomina11:Nomina'];
    const nomina = nomina12 || nomina11;

    if (nomina) {
      tipoCfdi = 'Nomina';
      nominaTipo = nomina['@_TipoNomina'] || 'O';
      nominaPercepciones = safeFloat(nomina['@_TotalPercepciones']);
      nominaDeducciones = safeFloat(nomina['@_TotalDeducciones']);

      const percepciones = nomina['nomina12:Percepciones'] || nomina['nomina11:Percepciones'];
      if (percepciones) {
        const items = percepciones['nomina12:Percepcion'] || percepciones['nomina11:Percepcion'] || [];
        const arr = Array.isArray(items) ? items : [items];
        for (const p of arr) {
          const tipo = p['@_TipoPercepcion'] || '';
          const gravado = safeFloat(p['@_ImporteGravado']);
          const exento = safeFloat(p['@_ImporteExento']);
          const total = gravado + exento;
          if (tipo === 'Sueldos' || tipo === '001') nominaSueldo += total;
          else if (tipo === 'Aguinaldo' || tipo === '002') nominaAguinaldo += total;
          else if (tipo === 'PrimaVacacional' || tipo === '003') nominaPrimaVacacional += total;
          else if (tipo === 'PrimaDominical' || tipo === '004') nominaPrimaDominical += total;
          else if (tipo === 'HorasExtra' || tipo === '005') nominaHorasExtra += total;
          else if (tipo === 'PTU' || tipo === '006') nominaPTU += total;
          else nominaOtrasPercepciones += total;
        }
      }

      const deducciones = nomina['nomina12:Deducciones'] || nomina['nomina11:Deducciones'];
      if (deducciones) {
        const items = deducciones['nomina12:Deduccion'] || deducciones['nomina11:Deduccion'] || [];
        const arr = Array.isArray(items) ? items : [items];
        for (const d of arr) {
          const tipo = d['@_TipoDeduccion'] || '';
          const importe = safeFloat(d['@_Importe']);
          if (tipo === '001' || tipo === 'CuotasObreroPatronales') nominaIMSS += importe;
          else if (tipo === '002' || tipo === 'RetencionISR') nominaISR += importe;
          else if (tipo === '003' || tipo === 'AportacionesFondosRetiro') nominaSAR += importe;
          else if (tipo === '004' || tipo === 'AportacionesPlanesPensiones') nominaINFONAVIT += importe;
          else if (tipo === '005' || tipo === 'Prestamo') nominaPensionAlimenticia += importe;
          else if (tipo === '008' || tipo === 'CreditoVivienda') nominaOtrasDeducciones += importe;
          else nominaOtrasDeducciones += importe;
        }
      }

      const otrosPagos = nomina['nomina12:OtrosPagos'] || nomina['nomina11:OtrosPagos'];
      if (otrosPagos) {
        const items = otrosPagos['nomina12:OtroPago'] || otrosPagos['nomina11:OtroPago'] || [];
        const arr = Array.isArray(items) ? items : [items];
        for (const o of arr) {
          const tipo = o['@_TipoOtroPago'] || '';
          if (tipo === 'SubsidioAlEmpleo' || tipo === '001') {
            nominaSubsidioAlEmpleo += safeFloat(o['@_Importe']);
          }
        }
      }
    }

    const pagos = complemento['pago10:Pagos'];
    if (pagos) {
      tipoCfdi = 'ComplementoPago';
      const pago = Array.isArray(pagos['pago10:Pago']) ? pagos['pago10:Pago'][0] : pagos['pago10:Pago'];
      if (pago) {
        cpFechaPago = pago['@_FechaPago'] || '';
        const docs = Array.isArray(pago['pago10:DoctoRelacionado']) ? pago['pago10:DoctoRelacionado'] : [pago['pago10:DoctoRelacionado']];
        const doc = docs?.[0];
        if (doc) {
          cpUuidRelacionado = doc['@_IdDocumento'] || '';
          cpMontoPago = safeFloat(doc['@_MontoPago']);
        }
      }
    }
  }

  return {
    uuid: timbre['@_UUID'] || '',
    rfcEmisor: emisor?.['@_Rfc'] || '',
    rfcReceptor: receptor?.['@_Rfc'] || '',
    metodoPago: cfdi['@_MetodoPago'] || '',
    formaPago: cfdi['@_FormaPago'] || '',
    subtotal: safeFloat(cfdi['@_SubTotal']),
    ivaTrasladado: extractIVATrasladado(cfdi),
    ivaRetenido: extractIVARetenido(cfdi),
    isrRetenido: extractISRRetenido(cfdi),
    total: safeFloat(cfdi['@_Total']),
    fechaEmision: cfdi['@_Fecha'] || '',
    fechaTimbrado: timbre['@_FechaTimbrado'] || '',
    usoCFDI: receptor?.['@_UsoCFDI'] || '',
    serie: cfdi['@_Serie'] || '',
    folio: cfdi['@_Folio'] || '',
    tipoCfdi,
    nominaTipo,
    nominaPercepciones,
    nominaDeducciones,
    nominaSueldo,
    nominaAguinaldo,
    nominaPrimaVacacional,
    nominaPrimaDominical,
    nominaHorasExtra,
    nominaPTU,
    nominaOtrasPercepciones,
    nominaIMSS,
    nominaISR,
    nominaINFONAVIT,
    nominaSAR,
    nominaPensionAlimenticia,
    nominaOtrasDeducciones,
    nominaSubsidioAlEmpleo,
    cpUuidRelacionado,
    cpFechaPago,
    cpMontoPago,
  };
}

const USOS_CFDI_NOMINA = ['CN01', 'CN02'];

export function clasificarMovimiento(rfcEmisor: string, rfcReceptor: string, rfcUsuario: string, usoCFDI: string, tipoCfdi: string): 'ingreso' | 'egreso' {
  if (tipoCfdi === 'ComplementoPago') return 'ingreso';

  if (esNomina(usoCFDI)) return 'ingreso';

  if (rfcReceptor.toUpperCase() === rfcUsuario.toUpperCase()) return 'egreso';
  if (rfcEmisor.toUpperCase() === rfcUsuario.toUpperCase()) return 'ingreso';

  throw new Error('El RFC del usuario no coincide con emisor ni receptor');
}

export function esNomina(usoCFDI: string): boolean {
  return USOS_CFDI_NOMINA.includes(usoCFDI.toUpperCase());
}
