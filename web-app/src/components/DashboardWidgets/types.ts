/**
 * Widget System Types
 * 
 * Defines types for the customizable dashboard widget system
 */

import type { Prop } from '../../types/props';
import type { CardData, BoardData } from '../../types/taskManager';
import type { Show } from '../../types/Show';
import type { ShoppingItem } from '../../shared/types/shopping';

export type WidgetId = 
  | 'my-tasks'
  | 'taskboard-quick-links'
  | 'task-planning-assistant'
  | 'taskboard-activity-summary'
  | 'upcoming-deadlines'
  | 'cut-props-packing'
  | 'props-needing-work'
  | 'shopping-approval-needed'
  | 'notifications'
  | 'delivery-list'
  | 'package-tracking';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  description?: string;
  defaultEnabled?: boolean;
  roles?: string[]; // Roles that should have this widget by default
  settings?: Record<string, unknown>; // Widget-specific settings
}

export interface WidgetPreferences {
  enabled: WidgetId[];
  config?: Partial<Record<WidgetId, Record<string, unknown>>>;
}

export interface DashboardWidgetProps {
  showId?: string;
  data?: {
    props?: Prop[];
    cards?: CardData[];
    boards?: BoardData[];
    show?: Show;
    shoppingItems?: ShoppingItem[];
  };
  onRefresh?: () => void;
}

export interface WidgetContainerProps extends DashboardWidgetProps {
  widgetId: WidgetId;
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  className?: string;
  onSettingsClick?: () => void;
  onClose?: () => void;
}

