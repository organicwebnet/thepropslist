import React, { useEffect, useState } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, ContentState, convertToRaw } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

interface WysiwygEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

const toolbarConfig = {
  options: ['inline', 'list', 'link'],
  inline: {
    options: ['bold', 'italic'],
    bold: { className: 'toolbar-button' },
    italic: { className: 'toolbar-button' },
    inDropdown: false,
  },
  list: {
    options: ['unordered', 'ordered'],
    unordered: { className: 'toolbar-button' },
    ordered: { className: 'toolbar-button' },
    inDropdown: false,
  },
  link: {
    options: ['link'],
    link: { className: 'toolbar-button' },
    inDropdown: false,
  },
};

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({ initialContent = '', onChange }) => {
  const [editorState, setEditorState] = useState(() => {
    if (!initialContent) {
      return EditorState.createEmpty();
    }

    const contentBlock = htmlToDraft(initialContent);
    const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
    return EditorState.createWithContent(contentState);
  });

  useEffect(() => {
    if (!initialContent) {
      setEditorState(EditorState.createEmpty());
      return;
    }

    const contentBlock = htmlToDraft(initialContent);
    const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
    setEditorState(EditorState.createWithContent(contentState));
  }, [initialContent]);

  const handleEditorStateChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
    
    if (onChange) {
      const contentState = newEditorState.getCurrentContent();
      const rawContentState = convertToRaw(contentState);
      const htmlContent = draftToHtml(rawContentState);
      onChange(htmlContent);
    }
  };

  return (
    <div className="wysiwyg-editor">
      <Editor
        editorState={editorState}
        onEditorStateChange={handleEditorStateChange}
        toolbar={toolbarConfig}
        wrapperClassName="editor-wrapper"
        editorClassName="editor-content"
        toolbarClassName="editor-toolbar"
      />
      <style>{`
        .wysiwyg-editor {
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .editor-wrapper {
          display: flex;
          flex-direction: column;
        }
        
        .editor-toolbar {
          border: none;
          border-bottom: 1px solid #ddd;
          padding: 8px;
          background: #f8f9fa;
        }
        
        .editor-content {
          padding: 16px;
          min-height: 200px;
        }
        
        .toolbar-button {
          padding: 4px 8px;
          margin: 0 2px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .toolbar-button:hover {
          background-color: #e9ecef;
        }
        
        .toolbar-button.rdw-option-active {
          background-color: #e2e6ea;
        }
      `}</style>
    </div>
  );
};