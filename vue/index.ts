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
} from "vue";
import type {
  ZoriConfig,
  ConsentPreferences,
  UserInfo,
  ZoriCoreAPI,
  ScrollHeatmapData,
  RecordingStatus,
  RecordingOptions,
} from "@zorihq/types";

export type { ZoriConfig, ConsentPreferences, UserInfo, ScrollHeatmapData, RecordingStatus, RecordingOptions } from "@zorihq/types";

export interface ZoriInstance extends Omit<ZoriCoreAPI, "getSessionId"> {
  isInitialized: Readonly<Ref<boolean>>;
  getSessionId: () => string | null;
}

export const ZoriKey: InjectionKey<ZoriInstance> = Symbol("zori");

export interface ZoriPluginOptions {
  config: ZoriConfig;
  router?: any;
  autoTrackPageViews?: boolean;
}

function createZoriInstance(config: ZoriConfig): ZoriInstance {
  const isInitialized = ref(false);
  let scriptLoaded = false;

  const loadScript = () => {
    if (scriptLoaded || typeof window === "undefined") return;

    (window as any).ZoriHQ = (window as any).ZoriHQ || [];

    const script = document.createElement("script");
    script.src = "https://cdn.zorihq.com/script.min.js";
    script.async = true;
    script.setAttribute("data-key", config.publishableKey);

    if (config.baseUrl) {
      script.setAttribute("data-base-url", config.baseUrl);
    }

    if (config.comebackThreshold !== undefined) {
      script.setAttribute(
        "data-comeback-threshold",
        config.comebackThreshold.toString(),
      );
    }

    if (config.trackQuickSwitches !== undefined) {
      script.setAttribute(
        "data-track-quick-switches",
        config.trackQuickSwitches.toString(),
      );
    }

    if (config.trackScrollDepth !== undefined) {
      script.setAttribute(
        "data-track-scroll-depth",
        config.trackScrollDepth.toString(),
      );
    }

    if (config.scrollThrottleMs !== undefined) {
      script.setAttribute(
        "data-scroll-throttle-ms",
        config.scrollThrottleMs.toString(),
      );
    }

    if (config.scrollDepthIntervals !== undefined) {
      script.setAttribute(
        "data-scroll-depth-intervals",
        JSON.stringify(config.scrollDepthIntervals),
      );
    }

    if (config.enableSessionRecording !== undefined) {
      script.setAttribute(
        "data-enable-session-recording",
        config.enableSessionRecording.toString(),
      );
    }

    if (config.rrwebCdnUrl !== undefined) {
      script.setAttribute("data-rrweb-cdn-url", config.rrwebCdnUrl);
    }

    script.onload = () => {
      isInitialized.value = true;
    };

    document.head.appendChild(script);
    scriptLoaded = true;
  };

  const track = async (
    eventName: string,
    properties?: Record<string, any>,
  ): Promise<boolean> => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.track === "function") {
      return await zori.track(eventName, properties);
    } else {
      zori.push(["track", eventName, properties]);
      return true;
    }
  };

  const identify = async (userInfo: UserInfo): Promise<boolean> => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.identify === "function") {
      return await zori.identify(userInfo);
    } else {
      zori.push(["identify", userInfo]);
      return true;
    }
  };

  const getVisitorId = async (): Promise<string> => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return "";

    if (typeof zori.getVisitorId === "function") {
      return await zori.getVisitorId();
    }

    return new Promise<string>((resolve) => {
      zori.push(["getVisitorId", (id: string) => resolve(id)]);
    });
  };

  const getSessionId = (): string | null => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.getSessionId !== "function") return null;
    return zori.getSessionId();
  };

  const setConsent = (preferences: ConsentPreferences): boolean => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.setConsent === "function") {
      return zori.setConsent(preferences);
    } else {
      zori.push(["setConsent", preferences]);
      return true;
    }
  };

  const optOut = (): boolean => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.optOut === "function") {
      return zori.optOut();
    } else {
      zori.push(["optOut"]);
      return true;
    }
  };

  const hasConsent = (): boolean => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.hasConsent !== "function") return true;
    return zori.hasConsent();
  };

  const getScrollData = (): ScrollHeatmapData | null => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.getScrollData !== "function") return null;
    return zori.getScrollData();
  };

  const startRecording = async (options?: RecordingOptions): Promise<boolean> => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.startRecording === "function") {
      return await zori.startRecording(options);
    } else {
      zori.push(["startRecording", options]);
      return true;
    }
  };

  const stopRecording = (): boolean => {
    const zori = (window as any).ZoriHQ;
    if (!zori) return false;

    if (typeof zori.stopRecording === "function") {
      return zori.stopRecording();
    } else {
      zori.push(["stopRecording"]);
      return true;
    }
  };

  const getRecordingStatus = (): RecordingStatus => {
    const zori = (window as any).ZoriHQ;
    if (!zori || typeof zori.getRecordingStatus !== "function") {
      return { isRecording: false, eventCount: 0, rrwebLoaded: false };
    }
    return zori.getRecordingStatus();
  };

  if (typeof window !== "undefined") {
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
    getScrollData,
    startRecording,
    stopRecording,
    getRecordingStatus,
  };
}

export const ZoriPlugin = {
  install(app: App, options: ZoriPluginOptions) {
    const zoriInstance = createZoriInstance(options.config);
    app.provide(ZoriKey, zoriInstance);

    if (options.router && options.autoTrackPageViews !== false) {
      options.router.afterEach((to: any) => {
        if (zoriInstance.isInitialized.value) {
          zoriInstance.track("page_view", {
            page_title: document.title,
            page_path: to.path,
            page_name: to.name,
            page_search: to.query ? JSON.stringify(to.query) : "",
          });
        }
      });
    }
  },
};

export function useZori(): ZoriInstance {
  const zori = inject(ZoriKey);
  if (!zori) {
    throw new Error(
      "useZori must be used within a component with ZoriPlugin installed",
    );
  }
  return zori;
}

export function usePageView(
  properties?: Ref<Record<string, any>> | Record<string, any>,
) {
  const { track, isInitialized } = useZori();

  onMounted(() => {
    if (isInitialized.value) {
      const props =
        typeof properties === "object" && "value" in properties
          ? properties.value
          : properties;
      track("page_view", {
        page_title: document.title,
        page_path: window.location.pathname,
        page_search: window.location.search,
        page_hash: window.location.hash,
        ...props,
      });
    }
  });

  if (properties && typeof properties === "object" && "value" in properties) {
    watch(
      properties,
      (newProps) => {
        if (isInitialized.value) {
          track("page_view", {
            page_title: document.title,
            page_path: window.location.pathname,
            page_search: window.location.search,
            page_hash: window.location.hash,
            ...newProps,
          });
        }
      },
      { deep: true },
    );
  }
}

export function useTrackEvent(
  eventName: string | Ref<string>,
  properties?: Ref<Record<string, any>> | Record<string, any>,
) {
  const { track, isInitialized } = useZori();

  onMounted(() => {
    if (isInitialized.value) {
      const name = typeof eventName === "string" ? eventName : eventName.value;
      const props =
        typeof properties === "object" && "value" in properties
          ? properties.value
          : properties;
      track(name, props);
    }
  });

  watch(
    [
      typeof eventName === "string" ? ref(eventName) : eventName,
      typeof properties === "object" && "value" in properties
        ? properties
        : ref(properties),
    ],
    ([newName, newProps]) => {
      if (isInitialized.value) {
        track(newName as string, newProps as Record<string, any>);
      }
    },
    { deep: true },
  );
}

export function useIdentify(userInfo: Ref<UserInfo> | UserInfo) {
  const { identify, isInitialized } = useZori();

  onMounted(() => {
    const info =
      typeof userInfo === "object" && "value" in userInfo
        ? userInfo.value
        : userInfo;
    if (isInitialized.value && info) {
      identify(info);
    }
  });

  if (userInfo && typeof userInfo === "object" && "value" in userInfo) {
    watch(
      userInfo,
      (newInfo) => {
        if (isInitialized.value && newInfo) {
          identify(newInfo);
        }
      },
      { deep: true },
    );
  }
}

export function useScrollData() {
  const { getScrollData, isInitialized } = useZori();
  const scrollData = ref<ScrollHeatmapData | null>(null);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    if (isInitialized.value) {
      scrollData.value = getScrollData();
    }

    // Update periodically
    intervalId = setInterval(() => {
      if (isInitialized.value) {
        scrollData.value = getScrollData();
      }
    }, 1000);
  });

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  watch(isInitialized, (initialized) => {
    if (initialized) {
      scrollData.value = getScrollData();
    }
  });

  return readonly(scrollData);
}

export function useSessionRecording() {
  const { startRecording, stopRecording, getRecordingStatus, isInitialized } = useZori();
  const status = ref<RecordingStatus>({
    isRecording: false,
    eventCount: 0,
    rrwebLoaded: false,
  });
  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    // Update status periodically
    intervalId = setInterval(() => {
      if (isInitialized.value) {
        status.value = getRecordingStatus();
      }
    }, 1000);
  });

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  const start = async (options?: RecordingOptions) => {
    const result = await startRecording(options);
    if (result) {
      status.value = getRecordingStatus();
    }
    return result;
  };

  const stop = () => {
    const result = stopRecording();
    status.value = getRecordingStatus();
    return result;
  };

  return {
    status: readonly(status),
    start,
    stop,
  };
}

export default {
  ZoriPlugin,
  useZori,
  usePageView,
  useTrackEvent,
  useIdentify,
  useScrollData,
  useSessionRecording,
};
