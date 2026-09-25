/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
                'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px
                'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
                '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
                '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
            },
            colors: {
                cinema: {
                    black: '#0a0a0a',
                    dark: '#141414',
                    gray: '#2f2f2f',
                },
                brand: {
                    red: '#E50914',   // Netflix-ish Red
                    blue: '#113ccf',  // Hotstar-ish Blue
                    accent: '#E50914',
                },
                text: {
                    primary: '#ffffff',
                    secondary: '#d1d5db',
                    muted: '#9ca3af',
                }
            },
            fontFamily: {
                sans: ['var(--font-body)', 'Inter', 'sans-serif'],
            },
            animation: {
                'slow-zoom': 'zoom 20s infinite alternate',
                'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                zoom: {
                    '0%': { transform: 'scale(1)' },
                    '100%': { transform: 'scale(1.15)' },
                }
            }
        },
    },
    plugins: [],
}
