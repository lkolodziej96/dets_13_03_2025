import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

function hexLoader(): Plugin {
  return {
    name: 'hex-loader',
    transform(_code: string, id: string) {
      const [path, query] = id.split('?');
      if (query !== 'raw-hex') return null;

      const data = fs.readFileSync(path);
      const hex = data.toString('hex');

      return `export default '${hex}';`;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), hexLoader()],
  base: '/dets_13_03_2025/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
