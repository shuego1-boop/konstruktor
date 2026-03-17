import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontSize: {
        'quiz-question': 'clamp(1.125rem, 2.5vw, 2rem)',
        'quiz-option': 'clamp(1rem, 2vw, 1.75rem)',
        'quiz-timer': 'clamp(1.5rem, 4vw, 3.5rem)',
        'quiz-title': 'clamp(1.25rem, 3vw, 2.5rem)',
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'bounce-in': 'bounceIn 0.4s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
