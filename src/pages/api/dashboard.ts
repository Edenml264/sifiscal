import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const hoy = new Date().toISOString().split('T')[0];
    const proximoMes = new Date();
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    const fechaLimite = proximoMes.toISOString().split('T')[0];

    // Total contribuyentes
    const contribuyentes = await client.execute('SELECT COUNT(*) as total FROM contribuyentes');

    // Obligaciones próximas
    const proximas = await client.execute({
      sql: `SELECT COUNT(*) as total FROM obligaciones_fiscales
            WHERE estatus = 'Pendiente' AND fecha_vencimiento BETWEEN ? AND ?`,
      args: [hoy, fechaLimite],
    });

    // Obligaciones vencidas
    const vencidas = await client.execute({
      sql: `SELECT COUNT(*) as total FROM obligaciones_fiscales
            WHERE estatus = 'Pendiente' AND fecha_vencimiento < ?`,
      args: [hoy],
    });

    // Avisos pendientes
    const avisos = await client.execute({
      sql: `SELECT COUNT(*) as total FROM notas WHERE tipo = 'Aviso' AND estatus = 'Pendiente'`,
      args: [],
    });

    // e.firma próximas a vencer
    const efirma = await client.execute({
      sql: `SELECT COUNT(*) as total FROM efirma_csd
            WHERE tipo = 'e.firma' AND fecha_vencimiento BETWEEN ? AND ?`,
      args: [hoy, fechaLimite],
    });

    // CSD próximos a vencer
    const csd = await client.execute({
      sql: `SELECT COUNT(*) as total FROM efirma_csd
            WHERE tipo = 'CSD' AND fecha_vencimiento BETWEEN ? AND ?`,
      args: [hoy, fechaLimite],
    });

    // Próximas obligaciones detalle
    const proximasDetalle = await client.execute({
      sql: `SELECT o.tipo, o.fecha_vencimiento as vencimiento, o.estatus,
                   c.nombre as contribuyente
            FROM obligaciones_fiscales o
            JOIN contribuyentes c ON o.contribuyente_id = c.id
            WHERE o.estatus = 'Pendiente' AND o.fecha_vencimiento BETWEEN ? AND ?
            ORDER BY o.fecha_vencimiento
            LIMIT 5`,
      args: [hoy, fechaLimite],
    });

    return new Response(JSON.stringify({
      totalContribuyentes: contribuyentes.rows[0]?.total || 0,
      obligacionesProximas: proximas.rows[0]?.total || 0,
      obligacionesVencidas: vencidas.rows[0]?.total || 0,
      avisosPendientes: avisos.rows[0]?.total || 0,
      efirmaProximas: efirma.rows[0]?.total || 0,
      csdProximos: csd.rows[0]?.total || 0,
      proximasObligaciones: proximasDetalle.rows,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
