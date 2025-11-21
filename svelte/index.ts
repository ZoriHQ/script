import { writable, readonly, derived, get, type Readable, type Writable } from 'svelte/store';
import { onMount, onDestroy } from 'svelte';
import type { ZoriConfig, ConsentPreferences, UserInfo, ZoriCoreAPI } from '@zorihq/types';

// Re-export shared types for convenience
export type { ZoriConfig, ConsentPreferences, UserInfo } from '@zorihq/types';

// Svelte-specific store type extending core API with reactive state
export interface ZoriStore extends Omit<ZoriCoreAPI, 'getSessionId'> {
  isInitialized: Readable<boolean>;
  getSessionId: () => string | null;
}

// Create the Zori store
export function createZoriStore(config: ZoriConfig): ZoriStore {
  const isInitialized = writable(false);
  let scriptLoaded = false;

  const loadScript = () => {
    if (scriptLoaded || typeof window === 'undefined') return;

    // Initialize queue
    (window as any).ZoriHQ = (window as any).ZoriHQ || [];

    // Load script
    const script = document.createElement('script');
    script.src = 'https://cdn.zorihq.com/script.min.js';
    script.async = true;
    script.setAttribute('data-key', config.publishableKey);

    if (config.baseUrl) {
      script.setAttribute('data-base-url', config.baseUrl);
    }

    if (config.comebackThreshold !== undefined) {
      script.setAttribute('data-comeback-threshold', config.comebackThreshold.toString());
    }

    if (config.trackQuickSwitches !== undefined) {
      script.setAttribute('data-track-quick-switches', config.trackQuickSwitches.toString());
    }

    script.onload = () => {
      isInitialized.set(true);
    };

    document.head.appendChild(script);
    scriptLoaded = true;
  };

  const track = async (eventName: string, properties?: Record<string, any>): Promise<boolean> => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.track === 'function') {
      return await zori.track(eventName, properties);
    } else {
      zori.push(['track', eventName, properties]);
      return true;
    }
  };

  const identify = async (userInfo: UserInfo): Promise<boolean> => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.identify === 'function') {
      return await zori.identify(userInfo);
    } else {
      zori.push(['identify', userInfo]);
      return true;
    }
  };

  const getVisitorId = async (): Promise<string> => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return '';

    if (typeof zori.getVisitorId === 'function') {
      return await zori.getVisitorId();
    }

    return new Promise<string>((resolve) => {
      zori.push(['getVisitorId', (id: string) => resolve(id)]);
    });
  };

  const getSessionId = (): string | null => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.getSessionId !== 'function') return null;
    return zori.getSessionId();
  };

  const setConsent = (preferences: ConsentPreferences): boolean => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.setConsent === 'function') {
      return zori.setConsent(preferences);
    } else {
      zori.push(['setConsent', preferences]);
      return true;
    }
  };

  const optOut = (): boolean => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.optOut === 'function') {
      return zori.optOut();
    } else {
      zori.push(['optOut']);
      return true;
    }
  };

  const hasConsent = (): boolean => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.hasConsent !== 'function') return true;
    return zori.hasConsent();
  };

  // Load script immediately
  if (typeof window !== 'undefined') {
    loadScript();
  }

  return {
    isInitialized: readonly(isInitialized),
    track,
    identify,
    getVisitorId,
    getSessionId,
    setConsent,
    optOut,
    hasConsent,
  };
}

// Global store instance (optional, for app-wide usage)
let globalStore: ZoriStore | null = null;

export function initZori(config: ZoriConfig): ZoriStore {
  if (!globalStore) {
    globalStore = createZoriStore(config);
  }
  return globalStore;
}

export function getZori(): ZoriStore {
  if (!globalStore) {
    throw new Error('Zori not initialized. Call initZori(config) first.');
  }
  return globalStore;
}

// Action: trackClick
export function trackClick(
  node: HTMLElement,
  options: { eventName?: string; properties?: Record<string, any> } = {}
) {
  const handleClick = async () => {
    const store = getZori();
    await store.track(options.eventName || 'click', options.properties || {});
  };

  node.addEventListener('click', handleClick);

  return {
    destroy() {
      node.removeEventListener('click', handleClick);
    },
  };
}

// Helper: usePageView (for components)
export function usePageView(properties?: Record<string, any>) {
  const store = getZori();

  onMount(() => {
    const unsubscribe = store.isInitialized.subscribe((initialized) => {
      if (initialized) {
        store.track('page_view', {
          page_title: document.title,
          page_path: window.location.pathname,
          page_search: window.location.search,
          page_hash: window.location.hash,
          ...properties,
        });
        unsubscribe();
      }
    });
  });
}

// Helper: useTrackEvent (for components)
export function useTrackEvent(eventName: string, properties?: Record<string, any>) {
  const store = getZori();

  onMount(() => {
    const unsubscribe = store.isInitialized.subscribe((initialized) => {
      if (initialized) {
        store.track(eventName, properties);
        unsubscribe();
      }
    });
  });
}

// Helper: useIdentify (for components)
export function useIdentify(userInfo: UserInfo | null) {
  const store = getZori();

  onMount(() => {
    if (!userInfo) return;

    const unsubscribe = store.isInitialized.subscribe((initialized) => {
      if (initialized) {
        store.identify(userInfo);
        unsubscribe();
      }
    });
  });
}

// Export default
export default {
  createZoriStore,
  initZori,
  getZori,
  trackClick,
  usePageView,
  useTrackEvent,
  useIdentify,
};
