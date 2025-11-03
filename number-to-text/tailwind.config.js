/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2B59C3',
        accent: '#F2A104',
        surface: '#F8FAFC',
        border: '#CBD5F5'
      }
    }
  },
  plugins: []
};
