import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Ensure chunks are handled correctly
    rollupOptions: {
        output: {
            manualChunks: {
                vendor: ['react', 'react-dom', 'socket.io-client', 'lucide-react', 'recharts']
            }
        }
    }
  },
  // Handle environment variables safely
  define: {
    'process.env': {} 
  }
});