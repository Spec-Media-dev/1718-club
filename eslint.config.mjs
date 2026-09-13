import next from 'eslint-config-next/core-web-vitals'

const config = [
  ...(Array.isArray(next) ? next : [next]),
  { ignores: ['.next/**', 'node_modules/**'] },
  {
    rules: {
      // Data fetching and the browser-only Supabase init legitimately call setState
      // inside guarded effects; treat this perf hint as a warning, not a build error.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]

export default config
