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
}

function extractIVATrasladado(cfdi: any): number {
  const traslados = cfdi['cfdi:Impuestos']?.['cfdi:Traslados']?.['cfdi:Traslado'];
  if (!traslados) return 0;
  const arr = Array.isArray(traslados) ? traslados : [traslados];
  const iva = arr.find((t: any) => t['@_Impuesto'] === '002');
  return iva ? parseFloat(iva['@_Importe']) : 0;
}

function extractIVARetenido(cfdi: any): number {
  const retenciones = cfdi['cfdi:Impuestos']?.['cfdi:Retenciones']?.['cfdi:Retencion'];
  if (!retenciones) return 0;
  const arr = Array.isArray(retenciones) ? retenciones : [retenciones];
  const iva = arr.find((r: any) => r['@_Impuesto'] === '002');
  return iva ? parseFloat(iva['@_Importe']) : 0;
}

function extractISRRetenido(cfdi: any): number {
  const retenciones = cfdi['cfdi:Impuestos']?.['cfdi:Retenciones']?.['cfdi:Retencion'];
  if (!retenciones) return 0;
  const arr = Array.isArray(retenciones) ? retenciones : [retenciones];
  const isr = arr.find((r: any) => r['@_Impuesto'] === '001');
  return isr ? parseFloat(isr['@_Importe']) : 0;
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
  const timbre = cfdi['cfdi:Complemento']['tfd:TimbreFiscalDigital'];

  return {
    uuid: timbre['@_UUID'],
    rfcEmisor: emisor['@_Rfc'],
    rfcReceptor: receptor['@_Rfc'],
    metodoPago: cfdi['@_MetodoPago'],
    formaPago: cfdi['@_FormaPago'],
    subtotal: parseFloat(cfdi['@_SubTotal']),
    ivaTrasladado: extractIVATrasladado(cfdi),
    ivaRetenido: extractIVARetenido(cfdi),
    isrRetenido: extractISRRetenido(cfdi),
    total: parseFloat(cfdi['@_Total']),
    fechaEmision: cfdi['@_Fecha'],
    fechaTimbrado: timbre['@_FechaTimbrado'],
    usoCFDI: receptor['@_UsoCFDI'],
    serie: cfdi['@_Serie'] || '',
    folio: cfdi['@_Folio'] || '',
  };
}

export function clasificarMovimiento(rfcEmisor: string, rfcReceptor: string, rfcUsuario: string): 'ingreso' | 'egreso' {
  if (rfcReceptor.toUpperCase() === rfcUsuario.toUpperCase()) return 'ingreso';
  if (rfcEmisor.toUpperCase() === rfcUsuario.toUpperCase()) return 'egreso';
  throw new Error('El RFC del usuario no coincide con emisor ni receptor');
}
