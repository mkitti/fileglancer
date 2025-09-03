import { mtConfig } from '@material-tailwind/react';

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/**/*.{html,js,jsx,ts,tsx}',
    './node_modules/@material-tailwind/react/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      backgroundImage: {
        'hover-gradient':
          'linear-gradient(120deg, rgb(var(--color-primary-light) / 0.2) , rgb(var(--color-secondary-light) / 0.2))',
        'hover-gradient-dark':
          'linear-gradient(120deg, rgb(var(--color-primary-dark) / 0.4), rgb(var(--color-secondary-dark) / 0.4))'
      },
      screens: {
        short: { raw: '(min-height: 0px) and (max-height: 420px)' }
      }
    }
  },
  plugins: [
    mtConfig({
      colors: {
        background: '#FFFFFF',
        foreground: '#4B5563',
        surface: {
          default: '#E5E7EB', // gray-200
          dark: '#D1D5DB', // gray-300
          light: '#F9FAFB', // gray-50
          foreground: '#1F2937' // gray-800
        },
        primary: {
          default: '#058d96', // HHMI primary brand color
          dark: '#04767f',
          light: '#36a9b0',
          foreground: '#FFFFFF'
        },
        secondary: {
          default: '#6D28D9', // Purple color
          dark: '#4C1D95',
          light: '#8B5CF6',
          foreground: '#FFFFFF'
        },
        success: {
          default: '#00a450', // HHMI primary brand color - icon color
          dark: '#bbf7d0', // border color (green-200 equivalent)
          light: '#f0fdf4', // background color (green-50 equivalent)
          foreground: '#15803d' // text color (green-700 equivalent)
        },
        info: {
          default: '#2563EB', // icon color
          dark: '#bfdbfe', // border color (blue-200 equivalent)
          light: '#eff6ff', // background color (blue-50 equivalent)
          foreground: '#1d4ed8' // text color (blue-700 equivalent)
        },
        warning: {
          default: '#d97706', // icon color (amber-600)
          dark: '#fed7aa', // border color (amber-200 equivalent)
          light: '#fffbeb', // background color (amber-50 equivalent)
          foreground: '#92400e' // text color (amber-800 equivalent)
        },
        error: {
          default: '#dc2626', // icon color
          dark: '#fecaca', // border color (red-200 equivalent)
          light: '#fef2f2', // background color (red-50 equivalent)
          foreground: '#991b1b' // text color (red-800 equivalent)
        }
      },
      darkColors: {
        background: '#030712',
        foreground: '#9CA3AF',
        surface: {
          default: '#1F2937', // gray-800
          dark: '#111827', // gray-900
          light: '#374151', // gray-700
          foreground: '#E5E7EB' // gray-200
        },
        primary: {
          default: '#36a9b0',
          dark: '#058d96',
          light: '#66c7d0',
          foreground: '#030712'
        },
        secondary: {
          default: '#8B5CF6',
          dark: '#6D28D9',
          light: '#C4B5FD',
          foreground: '#FFFFFF'
        },
        success: {
          default: '#33b473', // icon color (lighter green for dark theme)
          dark: '#166534', // border color (green-800 equivalent)
          light: '#052e16', // background color (green-950 equivalent)
          foreground: '#bbf7d0' // text color (green-200 equivalent)
        },
        info: {
          default: '#3B82F6', // icon color
          dark: '#1e40af', // border color (blue-800 equivalent)
          light: '#172554', // background color (blue-950 equivalent)
          foreground: '#bfdbfe' // text color (blue-200 equivalent)
        },
        warning: {
          default: '#f59e0b', // icon color (amber-500)
          dark: '#92400e', // border color (amber-800 equivalent)
          light: '#451a03', // background color (amber-950 equivalent)
          foreground: '#fed7aa' // text color (amber-200 equivalent)
        },
        error: {
          default: '#ef4444', // icon color
          dark: '#991b1b', // border color (red-800 equivalent)
          light: '#450a0a', // background color (red-950 equivalent)
          foreground: '#fecaca' // text color (red-200 equivalent)
        }
      }
    })
  ]
};

export default config;
