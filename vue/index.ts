import {
  ref,
  readonly,
  onMounted,
  onUnmounted,
  watch,
  inject,
  provide,
  type App,
  type Ref,
  type InjectionKey,
} from 'vue';

// Types
export interface ZoriConfig {
  publishableKey: string;
  baseUrl?: string;
  comebackThreshold?: number;
  trackQuickSwitches?: boolean;
}

export interface ConsentPreferences {
  analytics?: boolean;
  marketing?: boolean;
}

export interface UserInfo {
  app_id?: string;
  email?: string;
  fullname?: string;
  full_name?: string;
  [key: string]: any;
}

export interface ZoriInstance {
  isInitialized: Readonly<Ref<boolean>>;
  track: (eventName: string, properties?: Record<string, any>) => Promise<boolean>;
  identify: (userInfo: UserInfo) => Promise<boolean>;
  getVisitorId: () => Promise<string>;
  getSessionId: () => string | null;
  setConsent: (preferences: ConsentPreferences) => boolean;
  optOut: () => boolean;
  hasConsent: () => boolean;
}

// Injection Key
export const ZoriKey: InjectionKey<ZoriInstance> = Symbol('zori');

// Plugin Options
export interface ZoriPluginOptions {
  config: ZoriConfig;
  router?: any; // Vue Router instance
  autoTrackPageViews?: boolean;
}

// Create Zori Instance
function createZoriInstance(config: ZoriConfig): ZoriInstance {
  const isInitialized = ref(false);
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
      isInitialized.value = true;
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

// Vue Plugin
export const ZoriPlugin = {
  install(app: App, options: ZoriPluginOptions) {
    const zoriInstance = createZoriInstance(options.config);
    app.provide(ZoriKey, zoriInstance);

    // Auto-track page views with Vue Router
    if (options.router && options.autoTrackPageViews !== false) {
      options.router.afterEach((to: any) => {
        if (zoriInstance.isInitialized.value) {
          zoriInstance.track('page_view', {
            page_title: document.title,
            page_path: to.path,
            page_name: to.name,
            page_search: to.query ? JSON.stringify(to.query) : '',
          });
        }
      });
    }
  },
};

// Composable: useZori
export function useZori(): ZoriInstance {
  const zori = inject(ZoriKey);
  if (!zori) {
    throw new Error('useZori must be used within a component with ZoriPlugin installed');
  }
  return zori;
}

// Composable: usePageView
export function usePageView(properties?: Ref<Record<string, any>> | Record<string, any>) {
  const { track, isInitialized } = useZori();

  onMounted(() => {
    if (isInitialized.value) {
      const props = typeof properties === 'object' && 'value' in properties ? properties.value : properties;
      track('page_view', {
        page_title: document.title,
        page_path: window.location.pathname,
        page_search: window.location.search,
        page_hash: window.location.hash,
        ...props,
      });
    }
  });

  // Watch for changes if properties is a ref
  if (properties && typeof properties === 'object' && 'value' in properties) {
    watch(
      properties,
      (newProps) => {
        if (isInitialized.value) {
          track('page_view', {
            page_title: document.title,
            page_path: window.location.pathname,
            page_search: window.location.search,
            page_hash: window.location.hash,
            ...newProps,
          });
        }
      },
      { deep: true }
    );
  }
}

// Composable: useTrackEvent
export function useTrackEvent(
  eventName: string | Ref<string>,
  properties?: Ref<Record<string, any>> | Record<string, any>
) {
  const { track, isInitialized } = useZori();

  onMounted(() => {
    if (isInitialized.value) {
      const name = typeof eventName === 'string' ? eventName : eventName.value;
      const props = typeof properties === 'object' && 'value' in properties ? properties.value : properties;
      track(name, props);
    }
  });

  // Watch for changes
  watch(
    [
      typeof eventName === 'string' ? ref(eventName) : eventName,
      typeof properties === 'object' && 'value' in properties ? properties : ref(properties),
    ],
    ([newName, newProps]) => {
      if (isInitialized.value) {
        track(newName as string, newProps as Record<string, any>);
      }
    },
    { deep: true }
  );
}

// Composable: useIdentify
export function useIdentify(userInfo: Ref<UserInfo | null> | UserInfo | null) {
  const { identify, isInitialized } = useZori();

  onMounted(() => {
    const info = typeof userInfo === 'object' && 'value' in userInfo ? userInfo.value : userInfo;
    if (isInitialized.value && info) {
      identify(info);
    }
  });

  // Watch for changes if userInfo is a ref
  if (userInfo && typeof userInfo === 'object' && 'value' in userInfo) {
    watch(
      userInfo,
      (newInfo) => {
        if (isInitialized.value && newInfo) {
          identify(newInfo);
        }
      },
      { deep: true }
    );
  }
}

// Export default
export default {
  ZoriPlugin,
  useZori,
  usePageView,
  useTrackEvent,
  useIdentify,
};
