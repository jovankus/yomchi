/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Semantic theme tokens from design-system.css
                bg: 'var(--bg)',
                'bg-2': 'var(--bg-2)',
                panel: 'var(--panel)',
                'panel-hover': 'var(--panel-hover)',
                text: 'var(--text)',
                muted: 'var(--muted)',
                border: 'var(--border)',
                ring: 'var(--ring)',

                // Primary violet
                primary: {
                    DEFAULT: 'var(--primary)',
                    50: 'var(--violet-50)',
                    100: 'var(--violet-100)',
                    200: 'var(--violet-200)',
                    300: 'var(--violet-300)',
                    400: 'var(--violet-400)',
                    500: 'var(--violet-500)',
                    600: 'var(--violet-600)',
                    700: 'var(--violet-700)',
                    800: 'var(--violet-800)',
                    900: 'var(--violet-900)',
                },

                // Status colors
                success: {
                    DEFAULT: 'var(--success)',
                    400: 'var(--success-400)',
                    500: 'var(--success-500)',
                    600: 'var(--success-600)',
                    700: 'var(--success-700)',
                },
                warning: {
                    DEFAULT: 'var(--warning)',
                    400: 'var(--warning-400)',
                    500: 'var(--warning-500)',
                    600: 'var(--warning-600)',
                    700: 'var(--warning-700)',
                },
                danger: {
                    DEFAULT: 'var(--danger)',
                    400: 'var(--danger-400)',
                    500: 'var(--danger-500)',
                    600: 'var(--danger-600)',
                    700: 'var(--danger-700)',
                },

                // Dark backgrounds
                dark: {
                    950: 'var(--dark-950)',
                    900: 'var(--dark-900)',
                    850: 'var(--dark-850)',
                    800: 'var(--dark-800)',
                    750: 'var(--dark-750)',
                    700: 'var(--dark-700)',
                    600: 'var(--dark-600)',
                },
            },
        },
    },
    plugins: [],
}
