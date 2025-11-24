'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ZoriConfig, ConsentPreferences, UserInfo, ZoriCoreAPI, ScrollHeatmapData, RecordingStatus, RecordingOptions } from '@zorihq/types';

// Re-export shared types for convenience
export type { ZoriConfig, ConsentPreferences, UserInfo, ScrollHeatmapData, RecordingStatus, RecordingOptions } from '@zorihq/types';

// Next.js-specific context type extending core API
export interface ZoriContextType extends ZoriCoreAPI {
  isInitialized: boolean;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

    if (config.trackScrollDepth !== undefined) {
      script.setAttribute('data-track-scroll-depth', config.trackScrollDepth.toString());
    }

    if (config.scrollThrottleMs !== undefined) {
      script.setAttribute('data-scroll-throttle-ms', config.scrollThrottleMs.toString());
    }

    if (config.scrollDepthIntervals !== undefined) {
      script.setAttribute('data-scroll-depth-intervals', JSON.stringify(config.scrollDepthIntervals));
    }

    if (config.enableSessionRecording !== undefined) {
      script.setAttribute('data-enable-session-recording', config.enableSessionRecording.toString());
    }

    if (config.rrwebCdnUrl !== undefined) {
      script.setAttribute('data-rrweb-cdn-url', config.rrwebCdnUrl);
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

  // Auto-track page views on route change (App Router)
  useEffect(() => {
    if (isInitialized && autoTrackPageViews) {
      const zori = (window as any).ZoriHQ;
      if (zori) {
        const properties = {
          page_title: document.title,
          page_path: pathname,
          page_search: searchParams?.toString() || '',
          page_hash: window.location.hash,
        };

        if (typeof zori.track === 'function') {
          zori.track('page_view', properties);
        } else {
          zori.push(['track', 'page_view', properties]);
        }
      }
    }
  }, [pathname, searchParams, isInitialized, autoTrackPageViews]);

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

  const getScrollData = useCallback((): ScrollHeatmapData | null => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.getScrollData !== 'function') return null;
    return zori.getScrollData();
  }, []);

  const startRecording = useCallback(async (options?: RecordingOptions): Promise<boolean> => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.startRecording === 'function') {
      return await zori.startRecording(options);
    } else {
      zori.push(['startRecording', options]);
      return true;
    }
  }, []);

  const stopRecording = useCallback((): boolean => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.stopRecording === 'function') {
      return zori.stopRecording();
    } else {
      zori.push(['stopRecording']);
      return true;
    }
  }, []);

  const getRecordingStatus = useCallback((): RecordingStatus => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.getRecordingStatus !== 'function') {
      return { isRecording: false, eventCount: 0, rrwebLoaded: false };
    }
    return zori.getRecordingStatus();
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
    getScrollData,
    startRecording,
    stopRecording,
    getRecordingStatus,
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

// Hook to get scroll heatmap data
export const useScrollData = () => {
  const { getScrollData, isInitialized } = useZori();
  const [scrollData, setScrollData] = useState<ScrollHeatmapData | null>(null);

  useEffect(() => {
    if (!isInitialized) return;

    // Get initial data
    setScrollData(getScrollData());

    // Update periodically
    const interval = setInterval(() => {
      setScrollData(getScrollData());
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, getScrollData]);

  return scrollData;
};

// Hook for session recording
export const useSessionRecording = () => {
  const { startRecording, stopRecording, getRecordingStatus, isInitialized } = useZori();
  const [status, setStatus] = useState<RecordingStatus>({
    isRecording: false,
    eventCount: 0,
    rrwebLoaded: false,
  });

  useEffect(() => {
    if (!isInitialized) return;

    // Update status periodically while recording
    const interval = setInterval(() => {
      setStatus(getRecordingStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, getRecordingStatus]);

  const start = useCallback(async (options?: RecordingOptions) => {
    const result = await startRecording(options);
    if (result) {
      setStatus(getRecordingStatus());
    }
    return result;
  }, [startRecording, getRecordingStatus]);

  const stop = useCallback(() => {
    const result = stopRecording();
    setStatus(getRecordingStatus());
    return result;
  }, [stopRecording, getRecordingStatus]);

  return {
    ...status,
    start,
    stop,
  };
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
  useTrackEvent,
  useIdentify,
  useScrollData,
  useSessionRecording,
  TrackClick,
};
