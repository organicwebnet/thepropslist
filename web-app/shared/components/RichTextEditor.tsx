import React from 'react';
import { globalStyles } from '../styles/globalStyles';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = 200,
  disabled = false,
}) => {
  // Detect if running on web
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

  if (isWeb) {
    return (
      <div style={{ minHeight }} className="w-full">
        <textarea
          className="w-full rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-gray-300 p-3"
          style={{ minHeight, resize: 'vertical' }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    );
  }

  // For mobile platform, use a simple native implementation
  // (Keep this for React Native usage, if needed)
  // Remove react-native imports for web build
  return null;
}; 
