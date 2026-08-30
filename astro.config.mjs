import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  server: {
    port: 4321,
    host: 'localhost',
  },
  vite: {
    server: {
      hmr: {
        port: 4322,
      },
    },
  },
});
