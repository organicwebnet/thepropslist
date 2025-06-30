declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.webp';

declare module '@react-native-community/datetimepicker' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface DateTimePickerEvent {
    type: 'set' | 'dismissed' | 'neutralButtonPressed' | 'error';
    nativeEvent: {
      timestamp: number;
      utcOffset?: number; // iOS only
    };
  }

  export interface DateTimePickerProps extends ViewProps {
    value: Date;
    mode?: 'date' | 'time' | 'datetime' | 'countdown'; // 'datetime' and 'countdown' iOS only
    display?: 'default' | 'spinner' | 'calendar' | 'clock' | 'compact' | 'inline'; // 'calendar' and 'clock' Android only, 'compact' and 'inline' iOS 14+
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
    maximumDate?: Date;
    minimumDate?: Date;
    minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
    disabled?: boolean; // iOS only
    locale?: string; // iOS only
    timeZoneName?: string; // iOS & Android
    is24Hour?: boolean; // Android & Windows
    textColor?: string; // iOS only, display="spinner"
    accentColor?: string; // iOS 14+ display="compact"
    themeVariant?: 'light' | 'dark'; // iOS 14+
    positiveButton?: { label?: string; textColor?: string }; // Android
    negativeButton?: { label?: string; textColor?: string }; // Android
    neutralButton?: { label?: string; textColor?: string }; // Android
    onError?: (event: DateTimePickerEvent) => void; // Android
    testID?: string;
  }

  const DateTimePicker: ComponentType<DateTimePickerProps>;
  export default DateTimePicker;

  export interface DateTimePickerAndroidParams {
    value: Date;
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
    mode?: 'date' | 'time';
    display?: 'default' | 'spinner' | 'calendar' | 'clock';
    is24Hour?: boolean;
    maximumDate?: Date;
    minimumDate?: Date;
    minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
    positiveButton?: { label?: string; textColor?: string };
    negativeButton?: { label?: string; textColor?: string };
    neutralButton?: { label?: string; textColor?: string };
    onError?: (event: DateTimePickerEvent) => void;
    title?: string; // Android Material only
    initialInputMode?: 'default' | 'keyboard'; // Android Material only
    design?: 'default' | 'material'; // Android only
  }

  export class DateTimePickerAndroid {
    static open(params: DateTimePickerAndroidParams): void;
    static dismiss(mode: 'date' | 'time'): void;
  }
}

// It's good practice to ensure other custom declarations are not overwritten
// If there was existing content, it should be preserved.
// For now, assuming this is the only declaration needed in this file or the file is new.

declare module 'react-native-mentions-editor'; 
