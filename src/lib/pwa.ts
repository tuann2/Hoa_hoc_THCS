import { registerSW } from 'virtual:pwa-register';
import { useEffect, useState } from 'react';

export interface PwaState {
  canInstall: boolean;
  isOffline: boolean;
  isReady: boolean;
  isSessionActive: boolean;
  needsUpdate: boolean;
  isIos: boolean;
}

const initialState: PwaState = {
  canInstall: false,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  isReady: false,
  isSessionActive: false,
  needsUpdate: false,
  isIos:
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !('MSStream' in window)
};

let state = initialState;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let updateSW: (() => Promise<void>) | null = null;
let started = false;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function publish(next: Partial<PwaState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function initializePwa() {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('online', () => publish({ isOffline: false }));
  window.addEventListener('offline', () => publish({ isOffline: true }));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    publish({ canInstall: true });
  });

  if (!('serviceWorker' in navigator)) {
    return;
  }

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      publish({ needsUpdate: true });
    },
    onOfflineReady() {
      publish({ isReady: true });
    }
  });
}

export function setPwaSessionActive(active: boolean) {
  publish({ isSessionActive: active });
}

export function usePwaState(): PwaState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    initializePwa();
    const listener = () => forceRender((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}

export async function promptInstall() {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  publish({ canInstall: false });
}

export async function applyPwaUpdate() {
  if (!updateSW || state.isSessionActive) return;
  await updateSW();
}

export function resetPwaForTests() {
  state = initialState;
  deferredPrompt = null;
  updateSW = null;
  started = false;
  listeners.clear();
}
