import lineClamp from '@tailwindcss/line-clamp'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: {
          pink: '#ff4ecd',
          blue: '#00e5ff',
          lime: '#a8ff60'
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    },
  },
  plugins: [lineClamp],
}


