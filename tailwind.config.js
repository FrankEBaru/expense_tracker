/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        screen: 'var(--color-bg-screen)',
        card: 'var(--color-bg-card)',
        secondary: 'var(--color-bg-secondary)',
        nav: 'var(--color-bg-nav)',
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          positive: 'var(--text-positive)',
          negative: 'var(--text-negative)',
          onAccent: 'var(--text-on-accent)',
        },
        brand: {
          green: 'var(--color-green)',
          amber: 'var(--color-amber)',
          violet: 'var(--color-violet)',
          orange: 'var(--color-orange)',
          teal: 'var(--color-teal)',
        },
        tx: {
          1: 'var(--tx-1)',
          2: 'var(--tx-2)',
          3: 'var(--tx-3)',
          4: 'var(--tx-4)',
        },
      },
      borderRadius: {
        pill: 'var(--radius-pill)',
        card: 'var(--radius-card)',
        inner: 'var(--radius-inner)',
        icon: 'var(--radius-icon)',
      },
      fontFamily: {
        sans: ['var(--font-family)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
}
