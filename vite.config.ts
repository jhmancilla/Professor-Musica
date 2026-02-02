import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Use '.' instead of process.cwd() to avoid TS error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the Google GenAI SDK usage in the frontend
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})