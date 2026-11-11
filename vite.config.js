import { defineConfig } from 'vite';
import { createJobService, handleApi } from './server/jobs.mjs';

export default defineConfig({
  server: { watch: { ignored: ['**/.taste-skill/**', '**/.cache/**'] } },
  plugins: [{
    name: 'local-jobs-api',
    configureServer(server) {
      const service = createJobService();
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0].startsWith('/api/')) handleApi(req, res, service);
        else next();
      });
      server.httpServer?.once('close', () => service.close());
    },
  }],
});
