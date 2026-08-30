import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const mes = parseInt(url.searchParams.get('mes') || String(new Date().getMonth() + 1));
    const anio = parseInt(url.searchParams.get('anio') || String(new Date().getFullYear()));
    const contribuyenteId = url.searchParams.get('contribuyente_id') || '';

    const mesStr = mes.toString().padStart(2, '0');
    const primerDia = anio + '-' + mesStr + '-01';
    const ultimoDia = anio + '-' + mesStr + '-31';

    let sql = `SELECT o.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
               FROM obligaciones_fiscales o
               JOIN contribuyentes c ON o.contribuyente_id = c.id
               WHERE o.fecha_vencimiento BETWEEN ? AND ?`;
    const args: any[] = [primerDia, ultimoDia];

    if (contribuyenteId) {
      sql += ' AND o.contribuyente_id = ?';
      args.push(contribuyenteId);
    }

    sql += ' ORDER BY o.fecha_vencimiento ASC';

    const result = await client.execute({ sql, args });
    return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET calendario error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
