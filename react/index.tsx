import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

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

export interface ZoriContextType {
  isInitialized: boolean;
  track: (eventName: string, properties?: Record<string, any>) => Promise<boolean>;
  identify: (userInfo: UserInfo) => Promise<boolean>;
  getVisitorId: () => Promise<string>;
  getSessionId: () => string | null;
  setConsent: (preferences: ConsentPreferences) => boolean;
  optOut: () => boolean;
  hasConsent: () => boolean;
}

// Context
const ZoriContext = createContext<ZoriContextType | null>(null);

// Provider Props
export interface ZoriProviderProps {
  config: ZoriConfig;
  children: React.ReactNode;
  autoTrackPageViews?: boolean;
}

// Provider Component
export const ZoriProvider: React.FC<ZoriProviderProps> = ({
  config,
  children,
  autoTrackPageViews = true,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (scriptLoadedRef.current) return;

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
      setIsInitialized(true);
    };

    document.head.appendChild(script);
    scriptLoadedRef.current = true;

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [config]);

  const track = useCallback(async (eventName: string, properties?: Record<string, any>) => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.track === 'function') {
      return await zori.track(eventName, properties);
    } else {
      zori.push(['track', eventName, properties]);
      return true;
    }
  }, []);

  const identify = useCallback(async (userInfo: UserInfo) => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.identify === 'function') {
      return await zori.identify(userInfo);
    } else {
      zori.push(['identify', userInfo]);
      return true;
    }
  }, []);

  const getVisitorId = useCallback(async () => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return '';

    if (typeof zori.getVisitorId === 'function') {
      return await zori.getVisitorId();
    }

    return new Promise<string>((resolve) => {
      zori.push(['getVisitorId', (id: string) => resolve(id)]);
    });
  }, []);

  const getSessionId = useCallback(() => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.getSessionId !== 'function') return null;
    return zori.getSessionId();
  }, []);

  const setConsent = useCallback((preferences: ConsentPreferences) => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.setConsent === 'function') {
      return zori.setConsent(preferences);
    } else {
      zori.push(['setConsent', preferences]);
      return true;
    }
  }, []);

  const optOut = useCallback(() => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.optOut === 'function') {
      return zori.optOut();
    } else {
      zori.push(['optOut']);
      return true;
    }
  }, []);

  const hasConsent = useCallback(() => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.hasConsent !== 'function') return true;
    return zori.hasConsent();
  }, []);

  const contextValue: ZoriContextType = {
    isInitialized,
    track,
    identify,
    getVisitorId,
    getSessionId,
    setConsent,
    optOut,
    hasConsent,
  };

  return <ZoriContext.Provider value={contextValue}>{children}</ZoriContext.Provider>;
};

// Hook to use Zori
export const useZori = (): ZoriContextType => {
  const context = useContext(ZoriContext);
  if (!context) {
    throw new Error('useZori must be used within a ZoriProvider');
  }
  return context;
};

// Hook to track page views
export const usePageView = (properties?: Record<string, any>) => {
  const { track, isInitialized } = useZori();

  useEffect(() => {
    if (isInitialized) {
      track('page_view', {
        page_title: document.title,
        page_path: window.location.pathname,
        page_search: window.location.search,
        page_hash: window.location.hash,
        ...properties,
      });
    }
  }, [isInitialized, track, properties]);
};

// Hook to track events with dependencies
export const useTrackEvent = (
  eventName: string,
  properties?: Record<string, any>,
  dependencies: any[] = []
) => {
  const { track, isInitialized } = useZori();

  useEffect(() => {
    if (isInitialized) {
      track(eventName, properties);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, ...dependencies]);
};

// Hook to identify user
export const useIdentify = (userInfo: UserInfo | null) => {
  const { identify, isInitialized } = useZori();

  useEffect(() => {
    if (isInitialized && userInfo) {
      identify(userInfo);
    }
  }, [isInitialized, userInfo, identify]);
};

// Component to track clicks
export interface TrackClickProps {
  eventName?: string;
  properties?: Record<string, any>;
  children: React.ReactNode;
  as?: React.ElementType;
  [key: string]: any;
}

export const TrackClick: React.FC<TrackClickProps> = ({
  eventName = 'click',
  properties = {},
  children,
  as: Component = 'button',
  ...props
}) => {
  const { track } = useZori();

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      track(eventName, properties);
      if (props.onClick) {
        props.onClick(event);
      }
    },
    [track, eventName, properties, props]
  );

  return (
    <Component {...props} onClick={handleClick}>
      {children}
    </Component>
  );
};

export default {
  ZoriProvider,
  useZori,
  usePageView,
  useTrackEvent,
  useIdentify,
  TrackClick,
};
