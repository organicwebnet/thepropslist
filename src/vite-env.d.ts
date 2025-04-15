/// <reference types="vite/client" />

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface Window {
  google: {
    accounts: {
      id: {
        initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
        prompt: () => void;
      };
    };
  };
  gapi: {
    load: (api: string, callback: () => void) => void;
    auth2: {
      init: (config: { client_id: string; scope: string }) => Promise<void>;
      getAuthInstance: () => {
        isSignedIn: {
          get: () => boolean;
        };
        signIn: (options?: { prompt?: string; ux_mode?: string }) => Promise<void>;
        currentUser: {
          get: () => {
            getAuthResponse: () => {
              access_token: string;
            };
          };
        };
      };
    };
    client: {
      init: (config: {
        clientId: string;
        scope: string;
        discoveryDocs: string[];
      }) => Promise<void>;
      setToken: (token: { access_token: string }) => void;
      people: {
        people: {
          get: (params: {
            resourceName: string;
            personFields: string;
          }) => Promise<{
            result: {
              names?: Array<{ displayName: string }>;
              emailAddresses?: Array<{ value: string }>;
              photos?: Array<{ url: string }>;
              phoneNumbers?: Array<{ value: string }>;
              locations?: Array<{ value: string }>;
              organizations?: Array<{ name: string }>;
              biographies?: Array<{ value: string }>;
            };
          }>;
        };
      };
    };
  };
}