/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F0F2F5',
          card: '#FFFFFF',
          cardHover: '#F8FAFC',
          border: '#E2E8F0',
          purple: '#7C3AED',
          purpleHover: '#8B5CF6',
          blue: '#3B82F6',
          blueHover: '#2563EB',
          amber: '#F59E0B',
          green: '#10B981',
          red: '#EF4444',
          textPrimary: '#111827',
          textSecondary: '#374151',
          textMuted: '#6B7280'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px'
      },
      boxShadow: {
        'glow-purple': '0 0 30px rgba(108, 60, 247, 0.15)',
        card: '0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)'
      },
      backdropBlur: {
        card: '12px'
      }
    }
  },
  plugins: [],
}
