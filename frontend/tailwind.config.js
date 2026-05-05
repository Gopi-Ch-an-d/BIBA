/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        sidebar: {
          DEFAULT: '#0f172a', // Slate 900
          hover: '#1e293b',   // Slate 800
        },
        surface: {
          bg: '#f8fafc',      // Slate 50
          card: '#ffffff',
          border: '#e2e8f0',  // Slate 200
          muted: '#94a3b8',   // Slate 400
        }
      },
      fontFamily: {
        sans: ['"Montserrat"', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
