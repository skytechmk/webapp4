/// <reference types="vite/client" />

// Type declarations for Vite PWA virtual modules
declare module 'virtual:pwa-register/react' {
    export function useRegisterSW(options: {
        onRegistered?: (registration: any) => void;
        onRegisterError?: (error: any) => void;
    }): {
        offlineReady: boolean;
        needRefresh: boolean;
        updateServiceWorker: (reloadPage?: boolean) => void;
    };
}

declare module 'virtual:pwa-register' {
    export function registerSW(options: {
        onRegistered?: (registration: any) => void;
        onRegisterError?: (error: any) => void;
    }): {
        offlineReady: boolean;
        needRefresh: boolean;
        updateServiceWorker: (reloadPage?: boolean) => void;
    };
}