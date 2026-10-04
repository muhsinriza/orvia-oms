/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f9f4',
          100: '#dcf2e6',
          200: '#bbe5cf',
          300: '#8dd1b0',
          400: '#57b58a',
          500: '#33996d',
          600: '#237a56',
          700: '#1c6146',
          800: '#194e39',
          900: '#164030',
        }
      }
    }
  },
  plugins: []
}
