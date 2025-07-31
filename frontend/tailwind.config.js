// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      // --- НАЧАЛО ИЗМЕНЕНИЯ ---
      backgroundColor: {
        'chat': 'var(--chat-bg-color)',
        'chat-header': 'var(--chat-header-color)',
        'chat-bubble-own': 'var(--chat-bubble-own-color)',
        'chat-bubble-other': 'var(--chat-bubble-other-color)',
      },
      textColor: {
        'chat-bubble-own': 'var(--chat-bubble-own-text-color)',
        'chat-bubble-other': 'var(--chat-bubble-other-text-color)',
      },
      // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    },
  },
  plugins: [],
}