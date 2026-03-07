import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /* Set base to your repo name for GitHub Pages.
     Change 'sec-logger' to match your actual repository name. */
  base: '/sec-logger/',
})
