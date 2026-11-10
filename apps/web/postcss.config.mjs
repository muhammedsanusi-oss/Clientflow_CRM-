/*
 * Code guide: apps/web/postcss.config.mjs
 * CSS build configuration. Runs the Tailwind PostCSS plugin so utility classes used by pages/components
 * become CSS.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
