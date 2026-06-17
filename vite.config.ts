import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  publicDir: 'assets/extension',
  build: {
    outDir: 'dist/app',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts']
  }
});
