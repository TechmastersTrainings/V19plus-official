// Global ambient declarations for Node.js process and libraries

declare var process: {
  env: {
    NODE_ENV?: string;
    NEXT_PUBLIC_FIREBASE_API_KEY?: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    NEXT_PUBLIC_FIREBASE_APP_ID?: string;
    NEXT_PUBLIC_SOCKET_URL?: string;
    NEXT_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};

declare module 'react' {
  export = React;
  export as namespace React;
}

declare namespace React {
  export type ReactNode = any;
  export type ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> = any;
  export type JSXElementConstructor<P> = ((props: P) => ReactElement<any, any> | null) | (new (props: P) => Component<any, any>);
  export type ComponentType<P = any> = ComponentClass<P> | FunctionComponent<P>;
  export type ComponentClass<P = any, S = any> = new (props: P, context?: any) => Component<P, S>;
  export type FunctionComponent<P = any> = (props: P, context?: any) => ReactElement<any, any> | null;
  export type FC<P = any> = FunctionComponent<P>;

  export interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: FC<{ children: (value: T) => ReactNode }>;
    displayName?: string;
  }

  export class Component<P = any, S = any> {
    constructor(props: P, context?: any);
    props: P;
    state: S;
    context: any;
    setState<K extends keyof S>(
      state: ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | S | null) | (Pick<S, K> | S | null),
      callback?: () => void
    ): void;
    forceUpdate(callback?: () => void): void;
    render(): ReactNode;
  }

  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useRef<T>(initialValue?: T): { current: T };
  export function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useContext<T>(context: Context<T> | any): T;
  export function createContext<T>(defaultValue?: T): Context<T>;
  export function forwardRef<T, P = any>(render: (props: P, ref: any) => any): any;
  
  export interface FormEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: T;
    target: T;
  }
  export interface ChangeEvent<T = Element> {
    target: T & { value: string; checked?: boolean };
  }
  export interface KeyboardEvent<T = Element> {
    key: string;
    preventDefault(): void;
  }
  export interface ClipboardEvent<T = Element> {
    clipboardData: { getData(format: string): string };
    preventDefault(): void;
  }
  export interface ButtonHTMLAttributes<T> {
    [key: string]: any;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element extends React.ReactElement<any, any> {}
  interface ElementClass extends React.Component<any, any> {}
  interface ElementAttributesProperty {
    props: {};
  }
  interface ElementChildrenAttribute {
    children: {};
  }
}

declare module 'next/navigation' {
  export function useRouter(): {
    push(url: string): void;
    replace(url: string): void;
    back(): void;
    forward(): void;
    refresh(): void;
    prefetch(url: string): void;
  };
  export function usePathname(): string;
  export function useSearchParams(): {
    get(name: string): string | null;
  };
}

declare module 'next/link' {
  const Link: any;
  export default Link;
}

declare module 'react-hot-toast' {
  const toast: any;
  export const Toaster: any;
  export default toast;
}

declare module '@tanstack/react-query' {
  export class QueryClient {
    constructor(options?: any);
    invalidateQueries(filters?: any): Promise<void>;
    setQueryData(queryKey: any, updater: any): any;
    getQueryData(queryKey: any): any;
    refetchQueries(filters?: any): Promise<void>;
  }
  export const QueryClientProvider: any;
  export function useQueryClient(): QueryClient;
  export function useQuery(...args: any[]): any;
  export function useMutation(...args: any[]): any;
}

declare module 'socket.io-client' {
  export interface Socket {
    on(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    disconnect(): void;
  }
  export function io(url: string, options?: any): Socket;
}

declare module 'firebase/app' {
  export function initializeApp(config: any): any;
  export function getApps(): any[];
  export function getApp(): any;
}

declare module 'firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    phoneNumber: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    providerData: any[];
    getIdToken(forceRefresh?: boolean): Promise<string>;
    reload(): Promise<void>;
  }
  export interface ConfirmationResult {
    confirm(verificationCode: string): Promise<{ user: User }>;
  }
  export class RecaptchaVerifier {
    constructor(auth: any, container: string | HTMLElement, parameters?: any);
    clear(): void;
    render(): Promise<number>;
  }
  export class GoogleAuthProvider {
    setCustomParameters(params: any): void;
  }
  export type AuthCredential = any;
  export const browserLocalPersistence: any;
  export function getAuth(app?: any): any;
  export function setPersistence(auth: any, persistence: any): Promise<void>;
  export function onAuthStateChanged(auth: any, nextOrObserver: (user: User | null) => void, error?: (error: any) => void): () => void;
  export function signInWithEmailAndPassword(auth: any, email: string, password: string): Promise<{ user: User }>;
  export function createUserWithEmailAndPassword(auth: any, email: string, password: string): Promise<{ user: User }>;
  export function signInWithPopup(auth: any, provider: any): Promise<{ user: User }>;
  export function signInWithPhoneNumber(auth: any, phoneNumber: string, appVerifier: any): Promise<ConfirmationResult>;
  export function sendPasswordResetEmail(auth: any, email: string): Promise<void>;
  export function sendEmailVerification(user: User): Promise<void>;
  export function signOut(auth: any): Promise<void>;
  export function updateProfile(user: User, profile: { displayName?: string; photoURL?: string }): Promise<void>;
  export function linkWithCredential(user: User, credential: any): Promise<{ user: User }>;
}

declare module 'firebase/firestore' {
  export function getFirestore(app?: any): any;
  export function doc(firestore: any, ...pathSegments: string[]): any;
  export function getDoc(reference: any): Promise<{ exists(): boolean; data(): any }>;
  export function setDoc(reference: any, data: any, options?: { merge?: boolean }): Promise<void>;
  export function serverTimestamp(): any;
}

declare module 'firebase/storage' {
  export function getStorage(app?: any): any;
}

declare module '@capacitor/core' {
  export const Capacitor: {
    isNativePlatform(): boolean;
    getPlatform(): string;
  };
}

declare module '@capacitor/app' {
  export const App: {
    addListener(eventName: 'backButton' | 'appUrlOpen' | string, listenerFunc: (data: any) => void): Promise<{ remove: () => void }>;
    exitApp(): Promise<void>;
  };
}

declare module '@capacitor/push-notifications' {
  export const PushNotifications: {
    checkPermissions(): Promise<{ receive: 'prompt' | 'granted' | 'denied' }>;
    requestPermissions(): Promise<{ receive: 'prompt' | 'granted' | 'denied' }>;
    register(): Promise<void>;
    addListener(eventName: string, listenerFunc: (data: any) => void): Promise<{ remove: () => void }>;
  };
}

declare module '@capgo/capacitor-native-biometric' {
  export const NativeBiometric: {
    isAvailable(): Promise<{ isAvailable: boolean }>;
    verifyIdentity(options: any): Promise<void>;
    getCredentials(options: { server: string }): Promise<{ username?: string; password?: string }>;
    setCredentials(options: { username: string; password: string; server: string }): Promise<void>;
  };
}
