import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages deploys to https://<user>.github.io/<repo>/
// The base must match the repository name so all asset paths resolve correctly.
// Change this if deploying to a custom domain (set base: '/').
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/world-intelligence-oil/',
})
