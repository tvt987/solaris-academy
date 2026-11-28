import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (
            normalized.includes('/node_modules/react/') ||
            normalized.includes('/node_modules/react-dom/') ||
            normalized.includes('/node_modules/scheduler/')
          ) {
            return 'react';
          }
          if (normalized.includes('/node_modules/three/')) {
            return 'three';
          }
          if (normalized.includes('/node_modules/qrcode/')) {
            return 'qrcode';
          }
          if (normalized.includes('/src/engines/systemTopology3dEngine')) {
            return 'topology-3d-engine';
          }
          if (normalized.includes('/src/engines/systemDesignEngine')) {
            return 'system-design-engine';
          }
          if (normalized.includes('/src/engines/algoVisualizerEngine')) {
            return 'algo-engine';
          }
          if (normalized.includes('/src/engines/')) {
            return 'engines';
          }
          if (
            normalized.includes('/src/data/sandbox') ||
            normalized.includes('/src/data/courses')
          ) {
            return 'curriculum-data';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
