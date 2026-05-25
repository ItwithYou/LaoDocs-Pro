import { createContext, useContext } from 'react';

type ThemeType = 'light' | 'dark' | 'soft-blue' | 'warm-clay' | 'fresh-mint';

export const ThemeContext = createContext({
  theme: 'light' as ThemeType,
  setTheme: (theme: ThemeType) => {},
});

export const LanguageContext = createContext({
  isLao: true,
  toggleLanguage: () => {},
});

export const useTheme = () => useContext(ThemeContext);
export const useLanguage = () => useContext(LanguageContext);
