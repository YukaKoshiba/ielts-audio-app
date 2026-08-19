/**
 * Tailwind CSS configuration.
 *
 * theme.extend mirrors the CSS custom properties from the original
 * single-file prototype (index.html's `:root` block) so the visual
 * design carries over into utility classes without changing the look.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        bg: '#f7f4ef',
        card: '#ffffff',
        ink: '#222222',
        muted: '#777777',
        accent: '#d96f4f',
        accent2: '#334b5c',
        line: '#e7dfd5',
        good: '#3d8b63',
        mid: '#c58a27',
        bad: '#b85b54',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Noto Sans JP"',
          '"Hiragino Kaku Gothic ProN"',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 8px 30px #00000008',
        menu: '0 4px 18px #00000008',
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
