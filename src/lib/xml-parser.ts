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
