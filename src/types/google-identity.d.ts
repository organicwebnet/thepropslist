interface PromptMomentNotification {
  isDisplayed(): boolean;
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
  getNotDisplayedReason(): string;
  getSkippedReason(): string;
  getDismissedReason(): string;
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        use_fedcm_for_prompt?: boolean;
      }) => void;
      prompt: (callback: (notification: PromptMomentNotification | null) => void) => void;
      renderButton: (parent: HTMLElement, options: object) => void;
      disableAutoSelect: () => void;
    };
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token: string }) => void;
      }) => {
        requestAccessToken: () => void;
      };
    };
  };
}

declare global {
  interface Window {
    google: GoogleIdentityServices;
  }
} 