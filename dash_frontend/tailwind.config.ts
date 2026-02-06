import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // Scans all files in `src` for Tailwind classes
    "./node_modules/@shadcn/ui/dist/**/*.{js,ts,jsx,tsx}", // Includes shadcn/ui components
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        'widget-sm': '640px',
        'widget-md': '800px',
        'widget-lg': '1024px',
        'widget-xl': '1280px',
      },
      fontFamily: {
        sans: [
          'Inter',
          'sans-serif'
        ]
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        // Shadcn/UI standard colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        // Custom theme system - UI/Menu colors
        ui: {
          bg: {
            primary: 'var(--ui-bg-primary)',
            secondary: 'var(--ui-bg-secondary)',
            tertiary: 'var(--ui-bg-tertiary)',
            quaternary: 'var(--ui-bg-quaternary)',
          },
          border: {
            primary: 'var(--ui-border-primary)',
            secondary: 'var(--ui-border-secondary)',
          },
          text: {
            primary: 'var(--ui-text-primary)',
            secondary: 'var(--ui-text-secondary)',
            muted: 'var(--ui-text-muted)',
          },
          accent: {
            primary: 'var(--ui-accent-primary)',
            'primary-hover': 'var(--ui-accent-primary-hover)',
            'primary-light': 'var(--ui-accent-primary-light)',
            'primary-text': 'var(--ui-accent-primary-text)',
            'primary-bg': 'var(--ui-accent-primary-bg)',
            'primary-border': 'var(--ui-accent-primary-border)',
            secondary: 'var(--ui-accent-secondary)',
            'secondary-hover': 'var(--ui-accent-secondary-hover)',
            'secondary-light': 'var(--ui-accent-secondary-light)',
            'secondary-text': 'var(--ui-accent-secondary-text)',
            'secondary-bg': 'var(--ui-accent-secondary-bg)',
            'secondary-border': 'var(--ui-accent-secondary-border)',
          },
          success: 'var(--ui-success)',
          'success-text': 'var(--ui-success-text)',
          'success-bg': 'var(--ui-success-bg)',
          'success-border': 'var(--ui-success-border)',
          warning: 'var(--ui-warning)',
          'warning-text': 'var(--ui-warning-text)',
          'warning-bg': 'var(--ui-warning-bg)',
          'warning-border': 'var(--ui-warning-border)',
          info: 'var(--ui-info)',
          'info-text': 'var(--ui-info-text)',
          'info-bg': 'var(--ui-info-bg)',
          'info-border': 'var(--ui-info-border)',
          danger: 'var(--ui-danger)',
          'danger-text': 'var(--ui-danger-text)',
          'danger-bg': 'var(--ui-danger-bg)',
          'danger-border': 'var(--ui-danger-border)',
        }
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/container-queries")
  ], // Adds animation utilities from shadcn
} satisfies Config;