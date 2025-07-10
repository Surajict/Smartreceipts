/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#00C48C', // Teal green
        secondary: '#6C63FF', // Purple
        background: '#F8F9FA', // Light gray background
        accent: {
          yellow: '#FFD600', // Bright yellow
          red: '#FF6B6B', // Soft red
          purple: '#6C63FF' // Purple
        },
        text: {
          primary: '#22223B', // Dark blue-gray
          secondary: '#6D6A75', // Medium gray
          link: '#6C63FF' // Purple for links
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif']
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'button': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'button-hover': '0 4px 8px rgba(0, 0, 0, 0.15)'
      },
      backgroundImage: {
        'gradient-feature': 'linear-gradient(90deg, #E0FFE6 0%, #E6E6FF 100%)',
        'gradient-primary': 'linear-gradient(135deg, #00C48C 0%, #00A377 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #6C63FF 0%, #5A52D5 100%)',
        'gradient-accent': 'linear-gradient(135deg, #FFD600 0%, #FFC107 100%)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.btn-primary': {
          backgroundColor: '#00C48C',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          fontWeight: '600',
          '&:hover': {
            backgroundColor: '#00A377'
          }
        },
        '.btn-secondary': {
          backgroundColor: '#6C63FF',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          fontWeight: '600',
          '&:hover': {
            backgroundColor: '#5A52D5'
          }
        },
        '.card': {
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }
        }
      })
    }
  ],
};