import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['"Wix Madefor Text"', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: {
                    50: '#eef5ff',
                    100: '#d8e9ff',
                    500: '#1c84ee',
                    600: '#1374d6',
                    700: '#0d60b3',
                },
            },
        },
    },

    plugins: [forms],
};
