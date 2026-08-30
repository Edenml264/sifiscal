import type { APIRoute } from 'astro';
import { client } from '../../lib/turso';
import { generateId } from '../../lib/validations';

export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const id = url.searchParams.get('id');
    const action = url.searchParams.get('action') || '';

    if (action === 'export') {
      const contribuyentes = await client.execute('SELECT * FROM contribuyentes');
      const obligaciones = await client.execute('SELECT * FROM obligaciones_fiscales');
      const efirma = await client.execute('SELECT * FROM efirma_csd');
      const documentos = await client.execute('SELECT * FROM documentos');
      const notas = await client.execute('SELECT * FROM notas');
      const usuarios = await client.execute('SELECT * FROM usuarios');
      const facturas = await client.execute('SELECT * FROM facturas');
      const complementos = await client.execute('SELECT * FROM complementos_pago');

      const backup = {
        version: '1.0',
        fecha: new Date().toISOString(),
        usuario: user.usuario || user.nombre,
        datos: {
          contribuyentes: contribuyentes.rows,
          obligaciones_fiscales: obligaciones.rows,
          efirma_csd: efirma.rows,
          documentos: documentos.rows,
          notas: notas.rows,
          usuarios: usuarios.rows,
          facturas: facturas.rows,
          complementos_pago: complementos.rows,
        },
      };

      const backupJson = JSON.stringify(backup, null, 2);
      const tamano = (backupJson.length / 1024).toFixed(1) + ' KB';

      await client.execute({
        sql: `INSERT INTO respaldos (id, usuario_id, tipo, tamano, archivo_path)
              VALUES (?, ?, ?, ?, ?)`,
        args: [generateId(), user.id, 'Exportación', tamano, 'manual'],
      });

      return new Response(backupJson, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="sifiscal-backup-' + new Date().toISOString().split('T')[0] + '.json"',
        },
      });
    }

    if (id) {
      const result = await client.execute({
        sql: `SELECT r.*, u.nombre as usuario_nombre
              FROM respaldos r
              LEFT JOIN usuarios u ON r.usuario_id = u.id
              WHERE r.id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await client.execute({
      sql: `SELECT r.*, u.nombre as usuario_nombre
            FROM respaldos r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            ORDER BY r.created_at DESC`,
      args: [],
    });
    return new Response(JSON.stringify(result.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET respaldos error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const data = await request.json();
    const { datos } = data;

    if (!datos) {
      return new Response(JSON.stringify({ error: 'Datos de respaldo requeridos' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let imported = 0;

    if (datos.contribuyentes && Array.isArray(datos.contribuyentes)) {
      for (const c of datos.contribuyentes) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO contribuyentes (id, nombre, rfc, curp, domicilio, correo, telefono, contacto, regimen_fiscal, estatus, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [c.id, c.nombre, c.rfc, c.curp, c.domicilio, c.correo, c.telefono, c.contacto, c.regimen_fiscal, c.estatus, c.created_at, c.updated_at],
        });
        imported++;
      }
    }

    if (datos.obligaciones_fiscales && Array.isArray(datos.obligaciones_fiscales)) {
      for (const o of datos.obligaciones_fiscales) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO obligaciones_fiscales (id, contribuyente_id, tipo, periodo, fecha_vencimiento, estatus, fecha_presentacion, numero_operacion, notas, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [o.id, o.contribuyente_id, o.tipo, o.periodo, o.fecha_vencimiento, o.estatus, o.fecha_presentacion, o.numero_operacion, o.notas, o.created_at, o.updated_at],
        });
        imported++;
      }
    }

    if (datos.efirma_csd && Array.isArray(datos.efirma_csd)) {
      for (const e of datos.efirma_csd) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO efirma_csd (id, contribuyente_id, tipo, folio, fecha_emision, fecha_vencimiento, estatus, notas, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [e.id, e.contribuyente_id, e.tipo, e.folio, e.fecha_emision, e.fecha_vencimiento, e.estatus, e.notas, e.created_at, e.updated_at],
        });
        imported++;
      }
    }

    if (datos.notas && Array.isArray(datos.notas)) {
      for (const n of datos.notas) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO notas (id, contribuyente_id, tipo, titulo, contenido, estatus, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [n.id, n.contribuyente_id, n.tipo, n.titulo, n.contenido, n.estatus, n.created_at, n.updated_at],
        });
        imported++;
      }
    }

    const tamano = (JSON.stringify(datos).length / 1024).toFixed(1) + ' KB';
    await client.execute({
      sql: `INSERT INTO respaldos (id, usuario_id, tipo, tamano, archivo_path)
            VALUES (?, ?, ?, ?, ?)`,
      args: [generateId(), user.id, 'Importación', tamano, 'manual'],
    });

    return new Response(JSON.stringify({ success: true, imported }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('POST respaldos error:', error);
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

    await client.execute({ sql: 'DELETE FROM respaldos WHERE id = ?', args: [id] });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE respaldos error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
