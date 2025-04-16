import React, { useEffect, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Editor as TinyMCEEditor } from 'tinymce';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

// Add types for the image upload handler
interface BlobInfo {
  id: () => string;
  name: () => string;
  filename: () => string;
  blob: () => Blob;
  base64: () => string;
  blobUri: () => string;
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = '',
  minHeight = 200,
  disabled = false
}: WysiwygEditorProps): JSX.Element {
  // Get the current theme from CSS variables
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Check if we're in dark mode by looking at the background color
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-primary')
      .trim();
    setIsDarkMode(bgColor.startsWith('#1') || bgColor.startsWith('#0') || bgColor.startsWith('rgb(1') || bgColor.startsWith('rgb(0'));
  }, []);

  return (
    <Editor
      apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
      value={value}
      onEditorChange={(content: string) => onChange(content)}
      init={{
        height: 400,
        min_height: 400,
        menubar: false,
        plugins: 'link',
        toolbar: 'bold italic | link',
        toolbar_mode: 'wrap',
        toolbar_sticky: true,
        skin: isDarkMode ? 'oxide-dark' : 'oxide',
        content_css: isDarkMode ? 'dark' : 'default',
        link_default_target: '_blank',
        link_assume_external_targets: true,
        link_title: false,
        link_context_toolbar: true,
        link_quicklink: true,
        link_target_list: false,
        link_rel_list: false,
        link_class_list: false,
        extended_valid_elements: 'a[href|target=_blank|rel=noopener]',
        content_style: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: ${isDarkMode ? '#ffffff' : '#1f2937'};
            background-color: ${isDarkMode ? '#1a1a1a' : '#ffffff'};
            margin: 0;
            padding: 1.5rem;
            max-width: 100%;
          }
          .tox-tinymce {
            border: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'} !important;
            border-radius: 0.375rem !important;
          }
          .tox .tox-toolbar__group {
            padding: 0 8px !important;
          }
          .tox .tox-tbtn {
            height: 36px !important;
            width: 36px !important;
            margin: 2px !important;
          }
          .tox .tox-tbtn svg {
            transform: scale(1.2);
          }
          .tox .tox-form__group:not(:first-child) {
            display: none !important;
          }
        `,
        promotion: false,
        branding: false,
        placeholder: placeholder,
        statusbar: false,
        resize: false,
        width: '100%',
        quickbars_selection_toolbar: 'bold italic | link',
        contextmenu: '',
        valid_elements: 'p[style],strong,em,a[href|target=_blank|rel=noopener]',
        valid_styles: {
          '*': 'font-weight,font-style'
        },
        setup: (editor: TinyMCEEditor) => {
          editor.on('BeforeLinkInsert', (e: { data: { target: string; rel: string } }) => {
            e.data.target = '_blank';
            e.data.rel = 'noopener';
          });
        }
      }}
      className="w-full min-h-[400px] rounded-lg border border-[var(--border-color)] focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-transparent transition-colors"
    />
  );
} 