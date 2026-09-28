import type { Config } from "tailwindcss";

/**
 * Design tokens da Mustang Atlética.
 * Identidade: verde profundo / quase preto, dourado, off-white, preto.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          forest: "#0B1F17", // verde quase preto
          green: "#123B2A", // verde profundo
          moss: "#1E5C41", // verde de apoio
          gold: "#C8A349", // dourado principal
          goldLight: "#E3C878", // dourado claro
          goldDark: "#9A7B2E",
          cream: "#F6F3EA", // off-white
          ink: "#0A0C0B", // preto
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.06), 0 12px 32px -18px rgba(0,0,0,.45)",
        gold: "0 0 0 1px rgba(200,163,73,.35), 0 18px 45px -25px rgba(200,163,73,.55)",
      },
      backgroundImage: {
        "brand-radial":
          "radial-gradient(120% 120% at 15% 0%, #123B2A 0%, #0B1F17 45%, #070F0B 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
