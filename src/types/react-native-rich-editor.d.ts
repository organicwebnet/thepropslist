declare module 'react-native-rich-editor' {
  import { Component } from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export interface RichEditorProps {
    initialContentHTML?: string;
    onChange?: (text: string) => void;
    placeholder?: string;
    initialHeight?: number;
    onBlur?: () => void;
    style?: StyleProp<ViewStyle>;
  }

  export interface RichToolbarProps {
    editor?: any;
    actions?: string[];
    style?: StyleProp<ViewStyle>;
  }

  export class RichEditor extends Component<RichEditorProps> {}
  export class RichToolbar extends Component<RichToolbarProps> {}

  export const actions: {
    setBold: string;
    setItalic: string;
    insertBulletsList: string;
    insertOrderedList: string;
    insertLink: string;
    [key: string]: string;
  };
} 