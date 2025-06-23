import React from 'react';
import { Platform, TextInput, View, Text, ActivityIndicator } from 'react-native';
import { globalStyles } from '../../styles/globalStyles';

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
  // State to hold the dynamically imported web editor component
  const [WebEditorComponent, setWebEditorComponent] = React.useState<React.ComponentType<any> | null>(null);
  const [isLoadingWebEditor, setIsLoadingWebEditor] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'web' && !WebEditorComponent && !isLoadingWebEditor) {
      setIsLoadingWebEditor(true);
      // Dynamically import the web editor only on the web platform
      // import('react-simple-wysiwyg').then(module => {
      //   setEditorComponent(() => module.ReactSimpleWysiwyg);
      // });
      setIsLoadingWebEditor(false);
    }
  }, [WebEditorComponent, isLoadingWebEditor]);

  // For web platform - Render loading or the actual editor
  if (Platform.OS === 'web') {
    if (isLoadingWebEditor || !WebEditorComponent) {
      return (
        <View style={[globalStyles.justifyCenter, globalStyles.alignCenter, globalStyles.borderGray, globalStyles.borderRadius8, { minHeight }]}>
          {/* You can replace ActivityIndicator with a web-specific loader if preferred */}
          <ActivityIndicator />
          <Text>Loading Editor...</Text>
        </View>
      );
    }
    // Dynamically import Toolbar and Buttons here when WebEditorComponent is available
    const Editor = WebEditorComponent;
    // We need to dynamically import these too or ensure they are tree-shaken if not used on mobile
    // For simplicity, let's assume they are part of the default export or handle dynamically as well
    // This part might need refinement based on 'react-simple-wysiwyg' exports
    const { Toolbar, BtnBold, BtnItalic, BtnUnderline, BtnLink, BtnBulletList, BtnNumberedList } = Editor as any; // Using WebEditorComponent which should have these properties after dynamic import

    // NOTE: The inline style tag won't work directly in React Native.
    // Web-specific styles should be handled via CSS Modules, Tailwind, or other web styling methods.
    // The <style> tag is removed here.
    return (
      // Use View instead of div for the outer wrapper if needed, or rely on Editor's container
      <Editor
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)} // Added type for event
        disabled={disabled}
        containerProps={{
          style: {
            resize: 'vertical',
            minHeight: `${minHeight}px`,
            border: '1px solid #ccc', // Example style, replace with CSS classes/web styles
            borderRadius: '8px'
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