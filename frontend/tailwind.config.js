import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        fashion: {
          dark:   '#0F0E0D',
          accent: '#C4622D',
          light:  '#D97B4A',
          sand:   '#E8DDD0',
          warm:   '#FAF8F5',
          muted:  '#8B7355',
          card:   '#F4EFE8',
          border: '#DDD0C0',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'ui-serif', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        soft:    '0 18px 50px -32px rgb(15 23 42 / 0.35)',
        fashion: '0 24px 56px rgba(15, 14, 13, 0.12)',
        card:    '0 8px 32px rgba(139, 115, 85, 0.12)',
        glow:    '0 0 40px rgba(196, 98, 45, 0.25)',
      },
      backgroundImage: {
        'fashion-gradient':   'linear-gradient(135deg, #0F0E0D 0%, #1E1A17 100%)',
        'warm-gradient':      'linear-gradient(135deg, #FAF8F5 0%, #F0E8DC 100%)',
        'accent-gradient':    'linear-gradient(135deg, #C4622D 0%, #D97B4A 100%)',
        'hero-overlay':       'linear-gradient(105deg, rgba(15,14,13,0.72) 0%, rgba(15,14,13,0.38) 55%, rgba(15,14,13,0.08) 100%)',
        'card-overlay':       'linear-gradient(180deg, rgba(15,14,13,0) 40%, rgba(15,14,13,0.7) 100%)',
      },
      animation: {
        'marquee':      'announcement-marquee 30s linear infinite',
        'shimmer':      'shimmer 0.65s ease forwards',
        'float':        'float-up 3s ease-in-out infinite',
        'pulse-ring':   'pulse-ring 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite',
        'fade-in-up':   'fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
        'gradient':     'gradient-shift 4s ease infinite',
        'scroll-bounce':'scroll-bounce 2.2s ease-in-out infinite',
      },
      keyframes: {
        'announcement-marquee': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%':   { left: '-100%' },
          '100%': { left: '160%' },
        },
        'gradient-shift': {
          '0%,100%': { backgroundPosition: '0% center' },
          '50%':     { backgroundPosition: '100% center' },
        },
        'scroll-bounce': {
          '0%,100%': { transform: 'translateY(0)',   opacity: '0.6' },
          '50%':     { transform: 'translateY(8px)', opacity: '1'   },
        },
        'float-up': {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
        'pulse-ring': {
          '0%':   { boxShadow: '0 0 0 0 rgba(196,98,45,0.4)' },
          '70%':  { boxShadow: '0 0 0 12px rgba(196,98,45,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(196,98,45,0)'   },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
      },
      transitionTimingFunction: {
        'fashion': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [animate],
}
