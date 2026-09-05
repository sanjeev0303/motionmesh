import type { Config } from "tailwindcss"
import { createPreset } from 'fumadocs-ui/tailwind-plugin'

const config = {
  darkMode: ["class"],
  presets: [createPreset()],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './content/**/*.{md,mdx}',
    './node_modules/fumadocs-ui/dist/**/*.js',
	],
  prefix: "",
  theme: {
    // `base` must not be a text color: it collides with the font-size scale
    // (`.text-base` → `font-size`), which would force `color: var(--bg-base)`.
    textColor: ({ theme }) => {
      const colors = theme('colors')
      const { base: _base, ...rest } = colors
      return rest
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Literals (not var() refs) so opacity modifiers compile; keep in sync with globals.css
        base: "rgb(11 15 23)", // var(--bg-base)
        surface: {
          DEFAULT: "rgb(18 22 31)", // var(--bg-surface)
          raised: "rgb(26 31 43)", // var(--bg-surface-raised)
        },
        accent: {
          motion: "rgb(255 138 61)", // var(--accent-motion)
          mesh: "rgb(77 217 232)", // var(--accent-mesh)
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        text: {
          primary: "rgb(243 241 236)", // var(--text-primary)
          muted: "rgb(136 145 160)", // var(--text-muted)
        },
        borderSubtle: "rgb(35 40 56)", // var(--border-subtle)
        success: "rgb(61 220 151)", // var(--success)
        warning: "rgb(255 194 77)", // var(--warning)
        danger: "rgb(255 92 92)", // var(--danger)

        // shadcn compat
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)"],
        display: ["var(--font-space-grotesk)"],
        mono: ["var(--font-plex-mono)"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": {
            transform: "translateX(100%)",
          },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        progress: {
          from: { width: "0%" },
          to: { width: "100%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
