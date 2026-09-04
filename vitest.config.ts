import path from 'path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  return {
    test: {
      environment: 'node',
      globals: true,
      env: loadEnv(mode, process.cwd(), ''),
    },
    resolve: {
      alias: {
        '~': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
