import { createContext, useContext } from 'react';

export const ThemeContext = createContext({
  isDark: false,
  toggleDark: () => {},
});

export const LanguageContext = createContext({
  isLao: true,
  toggleLanguage: () => {},
});

export const useTheme = () => useContext(ThemeContext);
export const useLanguage = () => useContext(LanguageContext);
