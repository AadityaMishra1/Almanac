import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", "class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			display: [
  				'var(--font-display)'
  			],
  			sans: [
  				'var(--font-body)'
  			]
  		},
  		colors: {
  			brand: {
  				'50': 'var(--brand-50)',
  				'100': 'var(--brand-100)',
  				'200': 'var(--brand-200)',
  				'300': 'var(--brand-300)',
  				'400': 'var(--brand-400)',
  				'500': 'var(--brand-500)',
  				'600': 'var(--brand-600)',
  				'700': 'var(--brand-700)',
  				'800': 'var(--brand-800)',
  				'900': 'var(--brand-900)',
  				'950': 'var(--brand-950)'
  			},
  			surface: {
  				DEFAULT: 'var(--surface)',
  				secondary: 'var(--surface-secondary)',
  				tertiary: 'var(--surface-tertiary)'
  			},
  			border: {
  				DEFAULT: 'var(--border)',
  				subtle: 'var(--border-subtle)',
  			},
  			background: 'var(--surface)',
  			foreground: 'var(--text-primary)',
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
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		textColor: {
  			primary: 'var(--text-primary)',
  			secondary: 'var(--text-secondary)',
  			tertiary: 'var(--text-tertiary)'
  		},
  		borderRadius: {
  			DEFAULT: '0.75rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		animation: {
  			'fade-in': 'fade-in 0.2s ease-out',
  			'fade-in-up': 'fade-in-up 0.3s ease-out',
  			'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
  			'slide-in-right': 'slide-in-right 0.3s ease-out',
  			'scale-in': 'scale-in 0.15s ease-out',
  			shimmer: 'shimmer 2s infinite'
  		},
  		keyframes: {
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'fade-in-up': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(8px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in-bottom': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in-right': {
  				from: {
  					opacity: '0',
  					transform: 'translateX(20px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			'scale-in': {
  				from: {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-1000px 0'
  				},
  				'100%': {
  					backgroundPosition: '1000px 0'
  				}
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

