import type { Config } from "tailwindcss";

export default {
  darkMode: 'class', // Class-based dark mode (console uses .dark on .kc-root)
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
  	extend: {
  		fontWeight: {
  			normal: '400',
  			medium: '500',
  			semibold: '600',
  			bold: '700'
  		},
  		colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        // TailAdmin semantic badge/status colors
        success: {
          50: '#ecfdf3',
          100: '#d1fadf',
          500: '#12b76a',
          600: '#039855',
          700: '#027a48',
        },
        error: {
          50: '#fef3f2',
          300: '#fda29b',
          500: '#f04438',
          600: '#d92d20',
          700: '#b42318',
        },
        warning: {
          50: '#fffaeb',
          500: '#f79009',
          600: '#dc6803',
          700: '#b54708',
        },
        'blue-light': {
          50: '#f0f9ff',
          500: '#0ba5ec',
        },
        brand: {
          50: '#eef0ff',
          500: '#0E159A',
          600: '#0a0f70',
          400: '#4561de',
        },
        third: '#083464',
        gold: '#FFD700',
        forth: '#F5B754',
        // Brand rebrand: remap the entire Tailwind green + emerald palette to
        // a yellow scale anchored at #FFD400 so all existing
        // text-green-* / bg-green-* / border-green-* / emerald-* classes
        // render as yellow without touching individual call sites.
        green: {
          50: '#FFFBE6',
          100: '#FFF6C2',
          200: '#FFED80',
          300: '#FFE54D',
          400: '#FFDE26',
          500: '#FFD400',
          600: '#E6BE00',
          700: '#B39400',
          800: '#806900',
          900: '#4D3F00',
          950: '#2B2300',
        },
        emerald: {
          50: '#FFFBE6',
          100: '#FFF6C2',
          200: '#FFED80',
          300: '#FFE54D',
          400: '#FFDE26',
          500: '#FFD400',
          600: '#E6BE00',
          700: '#B39400',
          800: '#806900',
          900: '#4D3F00',
          950: '#2B2300',
        },
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontSize: {
  			xxs: '0.825rem'
  		},
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
        'accordion-down': {
          from: {
            height: '0'
  				},
          to: {
            height: 'var(--radix-accordion-content-height)'
  				}
  			},
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
  				},
          to: {
            height: '0'
  				}
  			},
        'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
        },
        'scale-in': {
          '0%': {
            transform: 'scale(0.95)',
            opacity: '0'
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1'
          }
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0)'
          },
          '50%': {
            transform: 'translateY(-10px)'
          }
        },
        'gradient': {
          '0%, 100%': {
            'background-position': '0% 50%'
          },
          '50%': {
            'background-position': '100% 50%'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.6s ease-out',
        'scale-in': 'scale-in 0.4s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'enter': 'fade-in 0.6s ease-out, scale-in 0.5s ease-out',
        'gradient': 'gradient 15s ease infinite',
        'float-3s': 'float 3s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.5s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;