import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-router-dom', 'react', 'react-dom', '@supabase/supabase-js'],
    exclude: ['lucide-react'],
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
});
