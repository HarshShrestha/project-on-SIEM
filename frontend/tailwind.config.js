/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'siem-bg': '#0d1117',
        'siem-surface': '#161b22',
        'siem-border': '#30363d',
        'siem-accent': '#00d4aa',
        'siem-critical': '#f85149',
        'siem-high': '#e3b341',
        'siem-medium': '#58a6ff',
        'siem-low': '#8b949e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
