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
