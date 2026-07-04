/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17324d',
        mist: '#f4f8f7',
        sea: '#1f6f78',
        lime: '#7ca34a',
        sand: '#f3e2b3',
        ember: '#c96c3b'
      },
      fontFamily: {
        heading: ['Alegreya', 'Georgia', 'serif'],
        body: ['"Source Sans 3"', '"Trebuchet MS"', 'sans-serif']
      },
      boxShadow: {
        card: '0 18px 40px rgba(23, 50, 77, 0.12)'
      }
    }
  },
  plugins: []
};
