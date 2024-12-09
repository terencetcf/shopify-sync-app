import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import SHOPIFY_PROXIES from './shopify_proxy.json';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const proxy = SHOPIFY_PROXIES.reduce((acc, { path, target }) => {
    acc[path] = {
      target,
      changeOrigin: true,
      rewrite: (pathToRewrite) =>
        pathToRewrite.replace(new RegExp(`^${path}`), ''),
    };
    return acc;
  }, {});

  return {
    plugins: [react()],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ['**/src-tauri/**'],
      },
      proxy,
    },
  };
});
