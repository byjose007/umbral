/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@umbral/design/tailwind-preset.cjs')],
  content: ['./src/**/*.{html,ts}'],
  // Ionic ships its own reset/utilities — Tailwind's preflight would fight it.
  corePlugins: { preflight: false },
  plugins: [],
};
