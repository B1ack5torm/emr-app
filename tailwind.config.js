/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F6F3EC",
        card: "#FFFFFF",
        ink: "#22303A",
        inkSoft: "#66747E",
        border: "#E2DCCE",
        accent: "#3D6A5C",
        accentDark: "#2C4E43",
        accentSoft: "#E7EFEA",
        alert: "#B5533C",
        alertSoft: "#F6E3DB",
        waiting: "#B8862E",
        waitingSoft: "#F7EDD9",
      },
      fontFamily: {
        serif: ["Lora", "serif"],
        sans: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
