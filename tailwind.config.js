/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#FFDA03', soft: '#FFF8D6', pale: '#FFFDF0', dark: '#E6C400' },
        ink: { DEFAULT: '#202124', muted: '#6B7280', faint: '#9CA3AF' },
        surface: { DEFAULT: '#FFFFFF', alt: '#F5F6F8' },
        line: '#E5E7EB',
        ok: { DEFAULT: '#16A34A', bg: '#DCFCE7' },
        warn: { DEFAULT: '#F59E0B', bg: '#FEF3C7', text: '#B45309' },
        bad: { DEFAULT: '#DC2626', bg: '#FEE2E2' },
      },
      fontFamily: {
        display: ['Poppins', 'Inter', 'Arial', 'sans-serif'],
        body: ['Inter', 'Poppins', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.06)',
        lift: '0 8px 24px rgba(0,0,0,0.08)',
        float: '0 6px 18px rgba(0,0,0,0.12)',
      },
      borderRadius: { btn: '14px', card: '16px', stall: '18px', banner: '20px', modal: '24px' },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(0.9)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        pulseRing: { '0%': { boxShadow: '0 0 0 0 rgba(255,218,3,0.7)' }, '100%': { boxShadow: '0 0 0 12px rgba(255,218,3,0)' } },
        sheet: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        bump: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.25)' } },
        draw: { from: { strokeDashoffset: 48 }, to: { strokeDashoffset: 0 } },
      },
      animation: {
        fadeIn: 'fadeIn 500ms ease-out both',
        slideUp: 'slideUp 220ms ease-out both',
        pop: 'pop 500ms cubic-bezier(.2,.8,.2,1) both',
        pulseRing: 'pulseRing 1.4s ease-out infinite',
        sheet: 'sheet 240ms ease-out both',
        bump: 'bump 300ms ease-out',
        draw: 'draw 500ms 200ms ease-out both',
      },
    },
  },
  plugins: [],
};
