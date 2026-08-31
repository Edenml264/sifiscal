import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import netlify from '@astrojs/netlify';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  output: 'server',
  adapter: isDev
    ? node({ mode: 'standalone' })
    : netlify(),
  server: {
    port: 4321,
    host: 'localhost',
  },
});
