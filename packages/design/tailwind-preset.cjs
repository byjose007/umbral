/**
 * Shared Tailwind preset for UMBRAL apps. Colors reference the CSS custom
 * properties defined in `tokens.css` so a single edit there updates every
 * app; Tailwind opacity modifiers (e.g. `bg-accent/50`) are not supported
 * this way, but no MVP screen needs them and it keeps tokens.css as the
 * single source of truth instead of duplicating raw values here.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: 'var(--umbral-bg)',
        surface: 'var(--umbral-surface)',
        'surface-2': 'var(--umbral-surface-2)',
        'surface-hover': 'var(--umbral-surface-hover)',
        border: 'var(--umbral-border)',
        'border-strong': 'var(--umbral-border-strong)',
        text: 'var(--umbral-text)',
        'text-muted': 'var(--umbral-text-muted)',
        'text-faint': 'var(--umbral-text-faint)',
        accent: 'var(--umbral-accent)',
        'accent-hover': 'var(--umbral-accent-hover)',
        'accent-text': 'var(--umbral-accent-text)',
        teal: 'var(--umbral-teal)',
        success: 'var(--umbral-success)',
        'success-bg': 'var(--umbral-success-bg)',
        warning: 'var(--umbral-warning)',
        'warning-bg': 'var(--umbral-warning-bg)',
        danger: 'var(--umbral-danger)',
        'danger-bg': 'var(--umbral-danger-bg)',
      },
      fontFamily: {
        sans: ['var(--umbral-font-sans)'],
        mono: ['var(--umbral-font-mono)'],
      },
      borderRadius: {
        sm: 'var(--umbral-radius-sm)',
        md: 'var(--umbral-radius-md)',
        lg: 'var(--umbral-radius-lg)',
      },
      boxShadow: {
        sm: 'var(--umbral-shadow-sm)',
        md: 'var(--umbral-shadow-md)',
      },
    },
  },
};
