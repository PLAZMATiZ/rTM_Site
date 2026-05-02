import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Plugin to stub out next/navigation for @vercel/analytics
const stubNextNavigation = (): Plugin => ({
  name: 'stub-next-navigation',
  enforce: 'pre',
  resolveId(id) {
    // Intercept next/navigation imports regardless of where they come from
    if (id === 'next/navigation' || id === 'next/navigation.js') {
      return '\0virtual:next-navigation';
    }
    // Handle Vite's optional peer dep wrapper
    if (id.startsWith('__vite-optional-peer-dep:next/navigation')) {
      return '\0virtual:next-navigation';
    }
  },
  load(id) {
    if (id === '\0virtual:next-navigation') {
      return `
        export const useParams = () => ({});
        export const usePathname = () => '';
        export const useSearchParams = () => new URLSearchParams();
      `;
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    stubNextNavigation(),
    react(),
    tailwindcss(),
  ],
})