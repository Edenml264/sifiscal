import { defineMiddleware } from 'astro:middleware';
import { validateSession } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const user = await validateSession(context.cookies);
  context.locals.user = user;

  // Protected routes
  const protectedRoutes = ['/dashboard', '/contribuyentes', '/obligaciones', '/calendario', '/efirma', '/expediente', '/notas', '/usuarios', '/respaldos', '/reportes'];
  const isProtected = protectedRoutes.some(route => context.url.pathname.startsWith(route));

  if (isProtected && !user) {
    return context.redirect('/');
  }

  return next();
});
