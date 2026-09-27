// Global ambient declarations for Node.js process and libraries before npm install

declare var process: {
  env: {
    NODE_ENV?: string;
    NEXT_PUBLIC_FIREBASE_API_KEY?: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    NEXT_PUBLIC_FIREBASE_APP_ID?: string;
    [key: string]: string | undefined;
  };
};

declare module 'firebase/app' {
  export function initializeApp(config: any): any;
  export function getApps(): any[];
  export function getApp(): any;
}

declare module 'firebase/auth' {
  export const browserLocalPersistence: any;
  export function getAuth(app?: any): any;
  export function setPersistence(auth: any, persistence: any): Promise<void>;
}

declare module 'firebase/storage' {
  export function getStorage(app?: any): any;
}
