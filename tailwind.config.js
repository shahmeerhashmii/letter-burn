/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        flame: "var(--flame)",
        ember: "var(--ember)",
        ok: "var(--ok)",
        text: "var(--text)",
        muted: "var(--muted)",
        ash: "var(--ash)",
        warn: "var(--warn)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        tile: "4px",
        button: "6px",
      },
    },
  },
  plugins: [],
};
