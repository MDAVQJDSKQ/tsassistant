import type { Config } from "tailwindcss"

const config = {
  darkMode: "class",
  content: [
    './pages/**/*.{ts,tsx}', // If you have a pages dir
    './components/**/*.{ts,tsx}', // For components folder
    './app/**/*.{ts,tsx}', // For App router
    './src/**/*.{ts,tsx}', // Include src directory generally
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Standard keyframes/animations often added by Shadcn UI init
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // Ensure tailwindcss-animate is installed!

} satisfies Config

export default config