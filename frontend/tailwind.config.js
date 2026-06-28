/** @type {import('tailwindcss').Config} */

// "Warm Wellness" palette. We remap Tailwind's blue/indigo/green/gray scales so the
// existing components (which use those names everywhere) recolor automatically — coral
// brand, sage secondary, warm-stone neutrals — without editing component layouts.
const coral = {
  50: '#FDF2EE', 100: '#FBE4DB', 200: '#F6C7B6', 300: '#F0A488', 400: '#EC8A66',
  500: '#E8765A', 600: '#D85F43', 700: '#B44A33', 800: '#8F3B2A', 900: '#742F22',
};
const terracotta = {
  50: '#FBEFE9', 100: '#F5DACF', 200: '#E9B7A2', 300: '#DD9275', 400: '#D17452',
  500: '#C25C3C', 600: '#A8492D', 700: '#883A24', 800: '#6D2F1F', 900: '#5A281B',
};
const sage = {
  50: '#F1F5EF', 100: '#E1EADD', 200: '#C5D6BD', 300: '#A3BE97', 400: '#88A77A',
  500: '#7E9B7A', 600: '#5F7A5A', 700: '#4B6147', 800: '#3D4F3A', 900: '#333F31',
};
const warmGray = {
  50: '#FAF7F2', 100: '#F1ECE4', 200: '#E3DBD0', 300: '#CFC5B8', 400: '#A89E8F',
  500: '#807769', 600: '#5F574B', 700: '#463F36', 800: '#2E2922', 900: '#1C1813',
};

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        // remapped scales (brand recolor happens here)
        blue: coral,
        indigo: terracotta,
        green: sage,
        gray: warmGray,
        // semantic aliases + canvas
        primary: coral,
        secondary: sage,
        coral,
        sage,
        terracotta,
        cream: '#FBF7F0',
        success: sage,
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
        },
        error: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(80, 60, 40, 0.08), 0 10px 20px -2px rgba(80, 60, 40, 0.05)',
        medium: '0 4px 25px -3px rgba(80, 60, 40, 0.12), 0 20px 25px -2px rgba(80, 60, 40, 0.1)',
        strong: '0 10px 50px -12px rgba(80, 60, 40, 0.25)',
      },
      spacing: { 18: '4.5rem', 88: '22rem', 128: '32rem' },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.5s ease-out',
        'bounce-soft': 'bounceSoft 2s infinite',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        bounceSoft: { '0%, 100%': { transform: 'translateY(-5%)' }, '50%': { transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.8' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
