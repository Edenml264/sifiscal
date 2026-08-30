import type { APIRoute } from 'astro';
import { client } from '../../../lib/turso';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { usuario, password } = await request.json();

  if (!usuario || !password) {
    return new Response(JSON.stringify({ error: 'Usuario y contraseña requeridos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await client.execute({
      sql: 'SELECT id, nombre, usuario, perfil, permisos, password_hash FROM usuarios WHERE usuario = ?',
      args: [usuario],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Credenciales incorrectas' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = result.rows[0];

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash as string);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Credenciales incorrectas' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    cookies.set('session', user.id as string, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        perfil: user.perfil,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
