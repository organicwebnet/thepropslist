// Base Props Types
export interface BaseProps {
  className?: string;
  style?: React.CSSProperties;
}

// Form Types
export interface FormFieldProps extends BaseProps {
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'pattern' | 'custom';
  message: string;
  validate?: (value: any) => boolean;
}

// Media Types
export interface MediaProps extends BaseProps {
  src: string;
  alt?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Navigation Types
export interface NavigationProps extends BaseProps {
  onNavigate: (route: string) => void;
  currentRoute: string;
}

// Layout Types
export interface LayoutProps extends BaseProps {
  children: React.ReactNode;
}

// Data Display Types
export interface DataDisplayProps extends BaseProps {
  data: any;
  loading?: boolean;
  error?: string;
}

// Component Categories for Documentation
export const ComponentCategories = {
  SHARED: [
    'PropCard',
    'SearchBar',
    'HelpTooltip',
    'LoadingSpinner',
    'ErrorBoundary',
    'ConfirmDialog'
  ],
  PLATFORM_SPECIFIC: {
    WEB: [
      'WysiwygEditor',
      'PdfPreview',
      'ExportToolbar'
    ],
    MOBILE: [
      'PhotoImport',
      'QRScanner',
      'OfflineIndicator'
    ]
  },
  FORM: [
    'PropForm',
    'ShowForm',
    'VenueForm',
    'ConfigForm',
    'AuthForm'
  ],
  MEDIA: [
    'ImageUpload',
    'VideoPlayer',
    'PhotoGallery',
    'ImageCarousel'
  ],
  NAVIGATION: [
    'TabNavigation',
    'Breadcrumbs',
    'MenuBar'
  ],
  DATA_DISPLAY: [
    'PropList',
    'ShowList',
    'DigitalAssetGrid',
    'DataTable'
  ]
} as const; 
