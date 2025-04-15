import React, { createContext, useContext, useState, useEffect } from 'react';

export type FontOption = 'system' | 'opendyslexic' | 'arial' | 'verdana';

export interface FontContextType {
  font: FontOption;
  setFont: (font: FontOption) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [font, setFont] = useState<FontOption>(() => {
    const saved = localStorage.getItem('font');
    return (saved as FontOption) || 'system';
  });

  useEffect(() => {
    localStorage.setItem('font', font);
    document.documentElement.style.setProperty('--font-family', getFontFamily(font));
    document.documentElement.setAttribute('data-font', font);
  }, [font]);

  return (
    <FontContext.Provider value={{ font, setFont }}>
      {children}
    </FontContext.Provider>
  );
}

export const useFont = (): FontContextType => {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
};

function getFontFamily(font: FontOption): string {
  switch (font) {
    case 'opendyslexic':
      return "'OpenDyslexic', system-ui, sans-serif";
    case 'arial':
      return "Arial, system-ui, sans-serif";
    case 'verdana':
      return "Verdana, system-ui, sans-serif";
    default:
      return "'Lexend', system-ui, -apple-system, sans-serif";
  }
} 