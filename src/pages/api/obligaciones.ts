import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { generateId, sanitizeString } from '../../lib/validations';

const TIPOS_VALIDOS = [
  'ISR', 'IVA', 'Retenciones', 'Declaración Mensual', 'Declaración Anual',
  'DIOT', 'Informativas', 'Avisos al RFC', 'Contabilidad Electrónica', 'Otras'
];

const ESTATOS_VALIDOS = ['Pendiente', 'Presentada', 'Vencida', 'Pagada', 'No Aplica'];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    const contribuyenteId = url.searchParams.get('contribuyente_id') || '';
    const tipo = url.searchParams.get('tipo') || '';
    const estatus = url.searchParams.get('estatus') || '';
    const autoGenerate = url.searchParams.get('auto_generate');

    // Auto-generate monthly obligations for a contribuyente
    if (autoGenerate && contribuyenteId) {
      return await autoGenerateObligaciones(contribuyenteId);
    }

    if (id) {
      const result = await client.execute({
        sql: `SELECT o.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
              FROM obligaciones_fiscales o
              JOIN contribuyentes c ON o.contribuyente_id = c.id
              WHERE o.id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'No encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let sql = `SELECT o.*, c.nombre as contribuyente_nombre, c.rfc as contribuyente_rfc
               FROM obligaciones_fiscales o
               JOIN contribuyentes c ON o.contribuyente_id = c.id
               WHERE 1=1`;
    const args: any[] = [];

    if (contribuyenteId) {
      sql += ' AND o.contribuyente_id = ?';
      args.push(contribuyenteId);
    }
    if (tipo) {
      sql += ' AND o.tipo = ?';
      args.push(tipo);
    }
    if (estatus) {
      sql += ' AND o.estatus = ?';
      args.push(estatus);
    }

    sql += ' ORDER BY o.fecha_vencimiento ASC';

    const result = await client.execute({ sql, args });
    return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET obligaciones error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

async function autoGenerateObligaciones(contribuyenteId: string) {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  const dayOfMonth = now.getDate();

  // Check if obligations already exist for this month
  const monthStr = String(currentMonth + 1).padStart(2, '0');
  const periodPrefix = `${currentYear}-${monthStr}`;

  const existing = await client.execute({
    sql: `SELECT id FROM obligaciones_fiscales
          WHERE contribuyente_id = ? AND periodo LIKE ?
          AND tipo IN ('ISR', 'IVA')`,
    args: [contribuyenteId, `${periodPrefix}%`],
  });

  if (existing.rows.length >= 2) {
    return new Response(JSON.stringify({ generated: false, message: 'Ya existen obligaciones para este mes' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Generate ISR and IVA obligations
  const mesNombre = MESES[currentMonth];
  const periodoTexto = `${mesNombre} ${currentYear}`;
  // Due date: 17th of next month
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const fechaVencimiento = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-17`;

  const tipos = [
    { tipo: 'IVA', notas: `Declaración IVA ${mesNombre} ${currentYear}` },
    { tipo: 'ISR', notas: `Declaración RESICO ${mesNombre} ${currentYear}` },
  ];

  const ids: string[] = [];
  for (const t of tipos) {
    // Check if this specific type already exists
    const alreadyExists = await client.execute({
      sql: `SELECT id FROM obligaciones_fiscales
            WHERE contribuyente_id = ? AND tipo = ? AND periodo = ?`,
      args: [contribuyenteId, t.tipo, periodoTexto],
    });
    if (alreadyExists.rows.length > 0) continue;

    const id = generateId();
    // If current day > 17, mark as Vencida immediately
    const estatus = dayOfMonth > 17 ? 'Vencida' : 'Pendiente';
    await client.execute({
      sql: `INSERT INTO obligaciones_fiscales (id, contribuyente_id, tipo, periodo, fecha_vencimiento, estatus, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, contribuyenteId, t.tipo, periodoTexto, fechaVencimiento, estatus, t.notas],
    });
    ids.push(id);
  }

  return new Response(JSON.stringify({ generated: true, ids, count: ids.length }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const data = await request.json();
    const { contribuyente_id, tipo, periodo, fecha_vencimiento, estatus, fecha_presentacion, numero_operacion, notas } = data;

    if (!contribuyente_id || !tipo || !fecha_vencimiento) {
      return new Response(JSON.stringify({ error: 'Contribuyente, tipo y fecha de vencimiento son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return new Response(JSON.stringify({ error: 'Tipo de obligación no válido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = generateId();
    await client.execute({
      sql: `INSERT INTO obligaciones_fiscales (id, contribuyente_id, tipo, periodo, fecha_vencimiento, estatus, fecha_presentacion, numero_operacion, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        contribuyente_id,
        tipo,
        sanitizeString(periodo || ''),
        fecha_vencimiento,
        estatus || 'Pendiente',
        fecha_presentacion || null,
        sanitizeString(numero_operacion || ''),
        sanitizeString(notas || ''),
      ],
    });

    return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('POST obligaciones error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const data = await request.json();
    const { id, contribuyente_id, tipo, periodo, fecha_vencimiento, estatus, fecha_presentacion, numero_operacion, notas, fecha_pago, comprobante_pago } = data;

    if (!id || !contribuyente_id || !tipo || !fecha_vencimiento) {
      return new Response(JSON.stringify({ error: 'ID, Contribuyente, tipo y vencimiento son obligatorios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (estatus && !ESTATOS_VALIDOS.includes(estatus)) {
      return new Response(JSON.stringify({ error: 'Estatus no válido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await client.execute({
      sql: `UPDATE obligaciones_fiscales
            SET contribuyente_id = ?, tipo = ?, periodo = ?, fecha_vencimiento = ?,
                estatus = ?, fecha_presentacion = ?, numero_operacion = ?, notas = ?,
                fecha_pago = ?, comprobante_pago = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        contribuyente_id,
        tipo,
        sanitizeString(periodo || ''),
        fecha_vencimiento,
        estatus || 'Pendiente',
        fecha_presentacion || null,
        sanitizeString(numero_operacion || ''),
        sanitizeString(notas || ''),
        fecha_pago || null,
        sanitizeString(comprobante_pago || ''),
        id,
      ],
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('PUT obligaciones error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await client.execute({ sql: 'DELETE FROM obligaciones_fiscales WHERE id = ?', args: [id] });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE obligaciones error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
