import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
    // Mevcut çalışma dizinini al (Eski __dirname yerine bunu kullanıyoruz)
    const root = process.cwd();
    const env = loadEnv(mode, root, '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': root, // '@' işaretini ana dizine yönlendir
        }
      }
    };
});
