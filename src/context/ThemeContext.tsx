import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'sky';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('devflow-theme');
    return (saved as Theme) || 'light';
  });

  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const saved = localStorage.getItem('devflow-accent');
    return (saved as AccentColor) || 'indigo';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Handle Theme
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('devflow-theme', theme);

    // Handle Accent Color via CSS Variables
    const colors: Record<AccentColor, string> = {
      indigo: '#4f46e5',
      rose: '#e11d48',
      emerald: '#10b981',
      amber: '#f59e0b',
      sky: '#0ea5e9'
    };
    const lightColors: Record<AccentColor, string> = {
      indigo: '#eef2ff',
      rose: '#fff1f2',
      emerald: '#ecfdf5',
      amber: '#fffbeb',
      sky: '#f0f9ff'
    };

    root.style.setProperty('--accent-primary', colors[accentColor]);
    root.style.setProperty('--accent-light', lightColors[accentColor]);
    localStorage.setItem('devflow-accent', accentColor);
  }, [theme, accentColor]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
