import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icons';

export function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
      {showLabel && (
        <span className="theme-toggle-label">
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </span>
      )}
    </button>
  );
}
