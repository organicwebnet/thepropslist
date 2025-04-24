import * as React from 'react';
import { useRef } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-rich-editor';

interface RichTextEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = '',
  onChange,
  placeholder = 'Start typing...',
}: RichTextEditorProps) => {
  const richText = useRef<RichEditor>(null);

  const handleChange = (text: string) => {
    onChange?.(text);
  };

  return (
    <View style={styles.container}>
      <RichToolbar
        editor={richText}
        actions={[
          actions.setBold,
          actions.setItalic,
          actions.insertBulletsList,
          actions.insertOrderedList,
          actions.insertLink,
        ]}
        style={styles.toolbar}
      />
      <RichEditor
        ref={richText}
        initialContentHTML={initialContent}
        onChange={handleChange}
        placeholder={placeholder}
        initialHeight={200}
        onBlur={Keyboard.dismiss}
        style={styles.editor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 250,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: 'white',
  },
  toolbar: {
    backgroundColor: '#F8F8F8',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  editor: {
    flex: 1,
    padding: 8,
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
}); 