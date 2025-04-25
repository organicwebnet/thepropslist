import React from 'react';
import { Platform, TextInput } from 'react-native';
import Editor, { Toolbar, BtnBold, BtnItalic, BtnUnderline, BtnLink, BtnBulletList, BtnNumberedList } from 'react-simple-wysiwyg';

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
  // For web platform
  if (Platform.OS === 'web') {
    return (
      <div className="rich-text-editor">
        <Editor
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          containerProps={{
            style: {
              resize: 'vertical',
              minHeight: `${minHeight}px`,
            },
          }}
        >
          <Toolbar>
            <BtnBold />
            <BtnItalic />
            <BtnUnderline />
            <BtnBulletList />
            <BtnNumberedList />
            <BtnLink />
          </Toolbar>
        </Editor>
        <style>{`
          .rsw-editor {
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            background: var(--input-bg);
            color: var(--text-primary);
          }
          
          .rsw-toolbar {
            border-bottom: 1px solid var(--border-color);
            background: var(--input-bg);
            padding: 0.5rem;
          }
          
          .rsw-btn {
            color: var(--text-primary);
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            padding: 0.25rem 0.5rem;
            margin: 0 0.25rem;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .rsw-btn:hover {
            background: var(--border-color);
          }
          
          .rsw-btn.rsw-active {
            background: var(--border-color);
            color: var(--text-primary);
          }
          
          .rsw-ce {
            padding: 1rem;
            min-height: ${minHeight}px;
          }
          
          .rsw-ce:focus {
            outline: none;
          }
          
          .rsw-ce ul {
            list-style: disc;
            padding-left: 2em;
          }
          
          .rsw-ce ol {
            list-style: decimal;
            padding-left: 2em;
          }
          
          .rsw-ce a {
            color: var(--primary);
            text-decoration: underline;
          }
        `}</style>
      </div>
    );
  }

  // For mobile platform, we'll use a simpler native implementation
  return (
    <TextInput
      style={{
        minHeight,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
      }}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      multiline
      textAlignVertical="top"
      editable={!disabled}
    />
  );
}; 