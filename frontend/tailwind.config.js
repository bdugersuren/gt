/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            DEFAULT: "#1E3A8A",
            dark: "#0F172A",
            light: "#3B82F6",
          },
          teal: {
            DEFAULT: "#0D9488",
            dark: "#059669",
            light: "#2DD4BF",
          },
          neutral: {
            pearl: "#F8FAFC",
            slate: "#F1F5F9",
            text: "#334155",
          }
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
};
