import type { APIContext } from 'astro';
import { client } from './turso';

export interface User {
  id: string;
  nombre: string;
  usuario: string;
  perfil: string;
  permisos: string[];
}

export async function validateSession(cookies: APIContext['cookies']): Promise<User | null> {
  const sessionId = cookies.get('session')?.value;
  if (!sessionId) return null;

  try {
    const result = await client.execute({
      sql: 'SELECT id, nombre, usuario, perfil, permisos FROM usuarios WHERE id = ?',
      args: [sessionId],
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id as string,
      nombre: row.nombre as string,
      usuario: row.usuario as string,
      perfil: row.perfil as string,
      permisos: JSON.parse(row.permisos as string),
    };
  } catch {
    return null;
  }
}

export function hasPermission(user: User, module: string, action: 'read' | 'write' = 'read'): boolean {
  if (user.perfil === 'Administrador') return true;

  const modulePerms = user.permisos.find(p => p.startsWith(module));
  if (!modulePerms) return false;

  if (action === 'write') return modulePerms.includes(':write');
  return true;
}
