import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Resolve workspace packages via their TypeScript source so
    // vitest doesn't need a built dist/ of @ats/db etc.
    alias: {
      '@ats/db': new URL('../../packages/db/src/index.ts', import.meta.url).pathname,
    },
  },
})
