import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Prop, Show } from '../types';

export type RootStackParamList = {
  Home: undefined;
  PropDetail: { prop: Prop };
  ShowDetail: { show: Show };
  AddProp: { showId: string } | undefined;
  EditProp: { prop: Prop };
  AddShow: undefined;
  EditShow: { show: Show };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 