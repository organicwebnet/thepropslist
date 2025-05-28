import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Show } from '../types/index.ts';
import type { Prop } from '../shared/types/props.ts';

export type RootStackParamList = {
  Home: undefined;
  MainTabs: undefined;
  PropDetail: { prop: Prop };
  ShowDetail: { show: Show };
  AddProp: { showId: string } | undefined;
  EditProp: { prop: Prop };
  AddShow: undefined;
  EditShow: { show: Show };
  PackingDetail: { show: Show };
  PropForm: { id: string, tab?: string };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

// Type augmentation for React Navigation
declare module '@react-navigation/native' {
  export interface RootParamList extends RootStackParamList {
    // Ensures RootParamList is not empty, even if RootStackParamList is empty or has optional-only properties.
    // Consider adding a common, always-present route or a placeholder if appropriate.
    _placeholder?: undefined; 
  }
} 