/// <reference types="vite/client" />

// Type declarations for virtual PWA module
declare module 'virtual:pwa-register/react' {
    export function useRegisterSW(): {
        updateServiceWorker: (force?: boolean) => Promise<void>;
        needRefresh: boolean;
        offlineReady: boolean;
    };
}

declare module 'virtual:pwa-register' {
    export function registerSW(): void;
}

interface Window {
    google?: any;
    googleSignInInitialized?: boolean;
}