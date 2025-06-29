/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#00C48C',
        secondary: '#6C63FF',
        background: '#FFE6E6',
        accent: {
          yellow: '#FFD600',
          red: '#FF6B6B',
          purple: '#6C63FF'
        },
        text: {
          primary: '#22223B',
          secondary: '#6D6A75',
          link: '#6C63FF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif']
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      },
      backgroundImage: {
        'gradient-feature': 'linear-gradient(90deg, #E0FFE6 0%, #E6E6FF 100%)'
      }
    },
  },
  plugins: [],
};