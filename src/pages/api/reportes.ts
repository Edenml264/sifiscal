import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const tipo = url.searchParams.get('tipo') || '';
    const contribuyenteId = url.searchParams.get('contribuyente_id') || '';

    if (!tipo) {
      return new Response(JSON.stringify({ error: 'Tipo de reporte requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let data: any[] = [];
    let titulo = '';
    let columnas: string[] = [];

    if (tipo === 'obligaciones-pendientes') {
      titulo = 'Obligaciones Pendientes';
      columnas = ['Contribuyente', 'RFC', 'Tipo', 'Periodo', 'Vencimiento', 'Estatus'];
      let sql = `SELECT o.*, c.nombre as contribuyente_nombre, c.rfc
                 FROM obligaciones_fiscales o
                 JOIN contribuyentes c ON o.contribuyente_id = c.id
                 WHERE o.estatus = 'Pendiente'`;
      const args: any[] = [];
      if (contribuyenteId) {
        sql += ' AND o.contribuyente_id = ?';
        args.push(contribuyenteId);
      }
      sql += ' ORDER BY o.fecha_vencimiento ASC';
      const result = await client.execute({ sql, args });
      data = result.rows.map((r: any) => [
        r.contribuyente_nombre, r.rfc, r.tipo, r.periodo || '-',
        r.fecha_vencimiento, r.estatus,
      ]);
    }

    else if (tipo === 'obligaciones-vencidas') {
      titulo = 'Obligaciones Vencidas';
      columnas = ['Contribuyente', 'RFC', 'Tipo', 'Periodo', 'Vencimiento', 'Estatus'];
      let sql = `SELECT o.*, c.nombre as contribuyente_nombre, c.rfc
                 FROM obligaciones_fiscales o
                 JOIN contribuyentes c ON o.contribuyente_id = c.id
                 WHERE o.estatus = 'Vencida'`;
      const args: any[] = [];
      if (contribuyenteId) {
        sql += ' AND o.contribuyente_id = ?';
        args.push(contribuyenteId);
      }
      sql += ' ORDER BY o.fecha_vencimiento ASC';
      const result = await client.execute({ sql, args });
      data = result.rows.map((r: any) => [
        r.contribuyente_nombre, r.rfc, r.tipo, r.periodo || '-',
        r.fecha_vencimiento, r.estatus,
      ]);
    }

    else if (tipo === 'efirma-proximas') {
      titulo = 'e.firmas Próximas a Vencer (30 días)';
      columnas = ['Contribuyente', 'RFC', 'Tipo', 'Emisión', 'Vencimiento', 'Días Restantes'];
      const hoy = new Date();
      const fechaLimite = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      let sql = `SELECT e.*, c.nombre as contribuyente_nombre, c.rfc
                 FROM efirma_csd e
                 JOIN contribuyentes c ON e.contribuyente_id = c.id
                 WHERE e.tipo = 'e.firma' AND e.fecha_vencimiento <= ? AND e.estatus = 'Vigente'`;
      const args: any[] = [fechaLimite];
      if (contribuyenteId) {
        sql += ' AND e.contribuyente_id = ?';
        args.push(contribuyenteId);
      }
      sql += ' ORDER BY e.fecha_vencimiento ASC';
      const result = await client.execute({ sql, args });
      data = result.rows.map((r: any) => {
        const venc = new Date(r.fecha_vencimiento);
        const dias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        return [r.contribuyente_nombre, r.rfc, r.tipo, r.fecha_emision, r.fecha_vencimiento, dias + ' días'];
      });
    }

    else if (tipo === 'csd-proximos') {
      titulo = 'CSD Próximos a Vencer (30 días)';
      columnas = ['Contribuyente', 'RFC', 'Folio', 'Emisión', 'Vencimiento', 'Días Restantes'];
      const hoy = new Date();
      const fechaLimite = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      let sql = `SELECT e.*, c.nombre as contribuyente_nombre, c.rfc
                 FROM efirma_csd e
                 JOIN contribuyentes c ON e.contribuyente_id = c.id
                 WHERE e.tipo = 'CSD' AND e.fecha_vencimiento <= ? AND e.estatus = 'Vigente'`;
      const args: any[] = [fechaLimite];
      if (contribuyenteId) {
        sql += ' AND e.contribuyente_id = ?';
        args.push(contribuyenteId);
      }
      sql += ' ORDER BY e.fecha_vencimiento ASC';
      const result = await client.execute({ sql, args });
      data = result.rows.map((r: any) => {
        const venc = new Date(r.fecha_vencimiento);
        const dias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        return [r.contribuyente_nombre, r.rfc, r.folio || '-', r.fecha_emision, r.fecha_vencimiento, dias + ' días'];
      });
    }

    else if (tipo === 'contribuyentes') {
      titulo = 'Listado de Contribuyentes';
      columnas = ['Nombre', 'RFC', 'Régimen Fiscal', 'Estatus', 'Correo'];
      let sql = `SELECT * FROM contribuyentes WHERE 1=1`;
      const args: any[] = [];
      if (contribuyenteId) {
        sql += ' AND id = ?';
        args.push(contribuyenteId);
      }
      sql += ' ORDER BY nombre ASC';
      const result = await client.execute({ sql, args });
      data = result.rows.map((r: any) => [
        r.nombre, r.rfc, r.regimen_fiscal, r.estatus, r.correo || '-',
      ]);
    }

    else {
      return new Response(JSON.stringify({ error: 'Tipo de reporte no válido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ titulo, columnas, data, fecha: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GET reportes error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
