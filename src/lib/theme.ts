import { useEffect, useState } from 'react';

// Saved per browser; with no choice saved the page follows the system setting.
const KEY = 'fbs-theme';
const read = () => { try { return localStorage.getItem(KEY) as 'light' | 'dark' | null; } catch { return null; } };

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(read);
  const [system, setSystem] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSystem(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme; }, [theme]);
  const isDark = theme ? theme === 'dark' : system;
  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
  };
  return { isDark, toggle };
}
