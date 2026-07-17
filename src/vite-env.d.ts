declare module 'virtual:pwa-register' {
  interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (
      url: string,
      registration?: ServiceWorkerRegistration
    ) => void;
  }

  export function registerSW(options?: RegisterSWOptions): () => Promise<void>;
}
