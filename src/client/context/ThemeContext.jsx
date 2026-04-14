import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  cyber: {
    id: 'cyber',
    name: 'Cyber',
    description: 'Modern cyan & indigo',
    bg: 'from-slate-950 via-indigo-950 to-slate-950',
    accent: 'cyan',
    primary: 'from-cyan-500 to-indigo-600',
    text: 'text-cyan-100',
    textMuted: 'text-cyan-300/70',
    border: 'border-cyan-500/20',
    hover: 'hover:bg-cyan-500/10',
    ring: 'focus:ring-cyan-400',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange & pink',
    bg: 'from-slate-950 via-orange-950 to-slate-950',
    accent: 'orange',
    primary: 'from-orange-500 to-pink-600',
    text: 'text-orange-100',
    textMuted: 'text-orange-300/70',
    border: 'border-orange-500/20',
    hover: 'hover:bg-orange-500/10',
    ring: 'focus:ring-orange-400',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Fresh green & teal',
    bg: 'from-slate-950 via-emerald-950 to-slate-950',
    accent: 'emerald',
    primary: 'from-emerald-500 to-teal-600',
    text: 'text-emerald-100',
    textMuted: 'text-emerald-300/70',
    border: 'border-emerald-500/20',
    hover: 'hover:bg-emerald-500/10',
    ring: 'focus:ring-emerald-400',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep purple & blue',
    bg: 'from-slate-950 via-purple-950 to-slate-950',
    accent: 'purple',
    primary: 'from-purple-600 to-blue-700',
    text: 'text-purple-100',
    textMuted: 'text-purple-300/70',
    border: 'border-purple-500/20',
    hover: 'hover:bg-purple-500/10',
    ring: 'focus:ring-purple-400',
  },
  volcano: {
    id: 'volcano',
    name: 'Volcano',
    description: 'Hot red & orange',
    bg: 'from-slate-950 via-red-950 to-slate-950',
    accent: 'red',
    primary: 'from-red-500 to-orange-600',
    text: 'text-red-100',
    textMuted: 'text-red-300/70',
    border: 'border-red-500/20',
    hover: 'hover:bg-red-500/10',
    ring: 'focus:ring-red-400',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue & cyan',
    bg: 'from-slate-950 via-blue-950 to-slate-950',
    accent: 'blue',
    primary: 'from-blue-500 to-cyan-500',
    text: 'text-blue-100',
    textMuted: 'text-blue-300/70',
    border: 'border-blue-500/20',
    hover: 'hover:bg-blue-500/10',
    ring: 'focus:ring-blue-400',
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Mystical green & purple',
    bg: 'from-slate-950 via-green-950 to-slate-950',
    accent: 'green',
    primary: 'from-green-500 to-purple-600',
    text: 'text-green-100',
    textMuted: 'text-green-300/70',
    border: 'border-green-500/20',
    hover: 'hover:bg-green-500/10',
    ring: 'focus:ring-green-400',
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura',
    description: 'Soft pink & rose',
    bg: 'from-slate-950 via-pink-950 to-slate-950',
    accent: 'pink',
    primary: 'from-pink-400 to-rose-600',
    text: 'text-pink-100',
    textMuted: 'text-pink-300/70',
    border: 'border-pink-500/20',
    hover: 'hover:bg-pink-500/10',
    ring: 'focus:ring-pink-400',
  },
  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean white & gray',
    bg: 'from-gray-50 via-white to-gray-50',
    accent: 'slate',
    primary: 'from-slate-700 to-slate-800',
    text: 'text-gray-900',
    textMuted: 'text-gray-700',
    border: 'border-gray-300',
    hover: 'hover:bg-gray-100',
    ring: 'focus:ring-slate-400',
    label: 'text-gray-800',
    input: 'text-gray-900 bg-white border-gray-300',
    button: 'text-gray-900',
    card: 'bg-white border-gray-200',
  },
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('appTheme');
    return saved && themes[saved] ? themes[saved] : themes.cyber;
  });

  useEffect(() => {
    localStorage.setItem('appTheme', currentTheme.id);
    // Set CSS variables for theme colors
    if (currentTheme.id === 'light') {
      document.documentElement.style.setProperty('--theme-text', '#111827');
      document.documentElement.style.setProperty('--theme-text-muted', '#4b5563');
      document.body.classList.add('light-theme');
    } else {
      document.documentElement.style.setProperty('--theme-text', '#e0f2fe');
      document.documentElement.style.setProperty('--theme-text-muted', '#06b6d4');
      document.body.classList.remove('light-theme');
    }
  }, [currentTheme]);

  const changeTheme = (themeId) => {
    if (themes[themeId]) {
      setCurrentTheme(themes[themeId]);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Helper functions for common text colors
export const getTextColorClass = (theme) => {
  return theme.id === 'light' ? 'text-gray-900' : 'text-white';
};

export const getLabelColorClass = (theme) => {
  return theme.id === 'light' ? 'text-gray-800' : 'text-cyan-300';
};

export const getMutedTextColorClass = (theme) => {
  return theme.id === 'light' ? 'text-gray-600' : 'text-cyan-300/70';
};

export const getInputColorClass = (theme) => {
  return theme.id === 'light' ? 'text-gray-900 bg-white border-gray-300' : 'text-white';
};

export const getHoverClass = (theme) => {
  return theme.id === 'light' ? 'hover:bg-gray-100' : 'hover:bg-cyan-500/10';
};

export const getBorderColorClass = (theme) => {
  return theme.id === 'light' ? 'border-gray-300' : 'border-cyan-500/20';
};
