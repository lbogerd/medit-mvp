/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Sora",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
      },
      colors: {
        // Sunset palette
        sunset: {
          50: "#fff7f5",
          100: "#ffeae5",
          200: "#ffd2c5",
          300: "#ffb3a0",
          400: "#ff8f75",
          500: "#ff6b4d",
          600: "#f24a2b",
          700: "#cf3418",
          800: "#a52815",
          900: "#872415",
        },
        // Intention accents
        accent: {
          teal: "#14b8a6",
          blue: "#3b82f6",
          violet: "#8b5cf6",
        },
      },
      boxShadow: {
        glass: "0 1px 2px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};
