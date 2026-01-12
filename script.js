(function () {
  "use strict";

  const VERSION = "1.0.0";
  const COOKIE_NAME = "zori_visitor_id";
  const SESSION_COOKIE_NAME = "zori_session_id";
  const CONSENT_COOKIE_NAME = "zori_consent";
  const COOKIE_EXPIRY_DAYS = 365 * 2; // 2 years
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const DEFAULT_API_URL = "https://ingestion.zorihq.com/ingest";
  const DEFAULT_COMEBACK_THRESHOLD_MS = 30 * 1000; // 30 seconds
  const DEFAULT_TRACK_QUICK_SWITCHES = false;
  const DEFAULT_SCROLL_TRACKING = true;
  const DEFAULT_SCROLL_THROTTLE_MS = 250;
  const DEFAULT_SCROLL_DEPTH_INTERVALS = [25, 50, 75, 90, 100];
  const DEFAULT_SESSION_RECORDING = false;
  const RRWEB_CDN_URL = "https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js";

  let consentState = {
    analytics: null, // null = not set, true = granted, false = denied
    marketing: null,
    hasConsent: false,
    respectDNT: true,
  };

  // Get script tag and extract configuration
  const scriptTag =
    document.currentScript || document.querySelector("script[data-key]");
  const config = {
    publishableKey: scriptTag?.getAttribute("data-key") || "",
    baseUrl: scriptTag?.getAttribute("data-base-url") || DEFAULT_API_URL,
    comebackThreshold:
      parseInt(scriptTag?.getAttribute("data-comeback-threshold")) ||
      DEFAULT_COMEBACK_THRESHOLD_MS,
    trackQuickSwitches:
      scriptTag?.getAttribute("data-track-quick-switches") === "true" ||
      DEFAULT_TRACK_QUICK_SWITCHES,
    // Scroll tracking configuration
    trackScrollDepth:
      scriptTag?.getAttribute("data-track-scroll-depth") !== "false" &&
      DEFAULT_SCROLL_TRACKING,
    scrollThrottleMs:
      parseInt(scriptTag?.getAttribute("data-scroll-throttle-ms")) ||
      DEFAULT_SCROLL_THROTTLE_MS,
    scrollDepthIntervals: (() => {
      const attr = scriptTag?.getAttribute("data-scroll-depth-intervals");
      if (attr) {
        try {
          return JSON.parse(attr);
        } catch (e) {
          return DEFAULT_SCROLL_DEPTH_INTERVALS;
        }
      }
      return DEFAULT_SCROLL_DEPTH_INTERVALS;
    })(),
    // Session recording configuration
    enableSessionRecording:
      scriptTag?.getAttribute("data-enable-session-recording") === "true" ||
      DEFAULT_SESSION_RECORDING,
    rrwebCdnUrl:
      scriptTag?.getAttribute("data-rrweb-cdn-url") || RRWEB_CDN_URL,
  };

  if (!config.publishableKey) {
    console.error("[ZoriHQ] Missing data-key attribute");
    return;
  }

  let pageHiddenAt = null;

  // Scroll tracking state
  let scrollState = {
    maxDepthPercent: 0,
    reachedIntervals: new Set(),
    lastScrollTime: 0,
    scrollSnapshots: [],
  };

  // Session recording state
  let recordingState = {
    isRecording: false,
    stopFn: null,
    events: [],
    rrwebLoaded: false,
  };

  // ==================== UTILITY FUNCTIONS ====================

  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function generateUUID() {
    return (
      "vis_" +
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })
    );
  }

  function generateEventId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  function getUTMParameters() {
    const params = new URLSearchParams(window.location.search);
    const utmParams = {};

    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ].forEach((param) => {
      const value = params.get(param);
      if (value) {
        utmParams[param] = value;
      }
    });

    return Object.keys(utmParams).length > 0 ? utmParams : null;
  }

  function getUTMHash() {
    // Create a hash of UTM params to detect new campaigns
    const utm = getUTMParameters();
    if (!utm) return null;
    return JSON.stringify(utm);
  }

  function generateSessionId() {
    return (
      "ses_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).substring(2, 9)
    );
  }

  function getCSSSelector(element) {
    if (!element) return null;

    if (element.id) {
      return `#${element.id}`;
    }

    let selector = element.nodeName.toLowerCase();

    if (element.className && typeof element.className === "string") {
      const classes = element.className
        .trim()
        .split(/\s+/)
        .filter((c) => c)
        .slice(0, 2); // Limit to 2 classes
      if (classes.length > 0) {
        selector += "." + classes.join(".");
      }
    }

    let parent = element.parentNode;
    let depth = 0;
    while (parent && depth < 3) {
      if (parent.id) {
        return `#${parent.id} > ${selector}`;
      }
      parent = parent.parentNode;
      depth++;
    }

    return selector;
  }

  function getClickElementInfo(element) {
    if (!element) return null;

    const info = {
      tag: element.nodeName.toLowerCase(),
      selector: getCSSSelector(element),
    };

    const text = element.textContent?.trim() || "";
    if (text.length > 0) {
      info.text = text.substring(0, 100);
    }

    if (element.tagName === "A") {
      info.type = "link";
      info.href = element.href || null;
      info.target = element.target || null;
    } else if (
      element.tagName === "BUTTON" ||
      element.getAttribute("role") === "button"
    ) {
      info.type = "button";
      info.button_type = element.type || "button";
    } else if (element.tagName === "INPUT") {
      info.type = "input";
      info.input_type = element.type || "text";
    } else if (
      element.onclick ||
      element.getAttribute("onclick") ||
      window.getComputedStyle(element).cursor === "pointer"
    ) {
      info.type = "clickable";
    } else {
      let parent = element.parentNode;
      let depth = 0;
      while (parent && depth < 3) {
        if (parent.tagName === "A") {
          info.type = "link";
          info.href = parent.href || null;
          info.target = parent.target || null;
          info.parent_link = true;
          break;
        } else if (
          parent.tagName === "BUTTON" ||
          parent.getAttribute("role") === "button"
        ) {
          info.type = "button";
          info.parent_button = true;
          break;
        }
        parent = parent.parentNode;
        depth++;
      }
    }

    const dataAttrs = {};
    for (let attr of element.attributes) {
      if (attr.name.startsWith("data-")) {
        dataAttrs[attr.name] = attr.value;
      }
    }
    if (Object.keys(dataAttrs).length > 0) {
      info.data_attributes = dataAttrs;
    }

    return info;
  }

  // ==================== BROWSER FINGERPRINTING ====================

  async function generateFingerprint() {
    const fp = {};

    fp.screen_resolution = `${window.screen.width}x${window.screen.height}`;
    fp.screen_color_depth = window.screen.colorDepth;
    fp.screen_pixel_depth = window.screen.pixelDepth;
    fp.viewport_size = `${window.innerWidth}x${window.innerHeight}`;
    fp.screen_orientation = window.screen.orientation?.type || "unknown";

    fp.user_agent = navigator.userAgent;
    fp.platform = navigator.platform;
    fp.language = navigator.language;
    fp.languages = navigator.languages ? navigator.languages.join(",") : "";
    fp.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fp.timezone_offset = new Date().getTimezoneOffset();

    fp.hardware_concurrency = navigator.hardwareConcurrency || "unknown";
    fp.device_memory = navigator.deviceMemory || "unknown";
    fp.max_touch_points = navigator.maxTouchPoints || 0;

    fp.cookies_enabled = navigator.cookieEnabled;
    fp.do_not_track = navigator.doNotTrack || "unknown";
    fp.local_storage = typeof Storage !== "undefined";
    fp.session_storage = typeof Storage !== "undefined";
    fp.indexed_db = !!window.indexedDB;

    if (navigator.plugins && navigator.plugins.length > 0) {
      fp.plugins = Array.from(navigator.plugins)
        .map((p) => p.name)
        .sort()
        .join(",");
    } else {
      fp.plugins = "none";
    }

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 200;
      canvas.height = 50;

      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("ZoriHQ Analytics 🔍", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("ZoriHQ Analytics 🔍", 4, 17);

      fp.canvas_fingerprint = canvas.toDataURL().substring(0, 100);
    } catch (e) {
      fp.canvas_fingerprint = "error";
    }

    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        fp.webgl_vendor = debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
          : "unknown";
        fp.webgl_renderer = debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : "unknown";
      } else {
        fp.webgl_vendor = "not_supported";
        fp.webgl_renderer = "not_supported";
      }
    } catch (e) {
      fp.webgl_vendor = "error";
      fp.webgl_renderer = "error";
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const analyser = context.createAnalyser();
        const gainNode = context.createGain();
        const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

        gainNode.gain.value = 0;
        oscillator.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(0);

        fp.audio_context = {
          sample_rate: context.sampleRate,
          state: context.state,
          max_channels: context.destination.maxChannelCount,
        };

        oscillator.stop();
        context.close();
      } else {
        fp.audio_context = "not_supported";
      }
    } catch (e) {
      fp.audio_context = "error";
    }

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        fp.media_devices = {
          audio_input: devices.filter((d) => d.kind === "audioinput").length,
          audio_output: devices.filter((d) => d.kind === "audiooutput").length,
          video_input: devices.filter((d) => d.kind === "videoinput").length,
        };
      } catch (e) {
        fp.media_devices = "error";
      }
    } else {
      fp.media_devices = "not_supported";
    }

    if (
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection
    ) {
      const conn =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;
      fp.connection = {
        effective_type: conn.effectiveType || "unknown",
        downlink: conn.downlink || "unknown",
        rtt: conn.rtt || "unknown",
      };
    }

    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        fp.battery = {
          charging: battery.charging,
          level: Math.round(battery.level * 100),
        };
      } catch (e) {
        fp.battery = "error";
      }
    }

    const fpString = JSON.stringify(fp);
    let hash = 0;
    for (let i = 0; i < fpString.length; i++) {
      const char = fpString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    fp.fingerprint_hash = Math.abs(hash).toString(36);

    return fp;
  }

  // ==================== VISITOR ID MANAGEMENT ====================

  async function getOrCreateVisitorId() {
    let visitorId = getCookie(COOKIE_NAME);

    if (!visitorId) {
      visitorId = generateUUID();
      setCookie(COOKIE_NAME, visitorId, COOKIE_EXPIRY_DAYS);

      const fingerprint = await generateFingerprint();
      try {
        localStorage.setItem("zori_fp", JSON.stringify(fingerprint));
      } catch (e) {}
    }

    return visitorId;
  }

  // ==================== CONSENT MANAGEMENT ====================

  function checkDoNotTrack() {
    const dnt =
      navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    return dnt === "1" || dnt === "yes";
  }

  function loadConsentState() {
    const consentCookie = getCookie(CONSENT_COOKIE_NAME);
    if (consentCookie) {
      try {
        const consent = JSON.parse(decodeURIComponent(consentCookie));
        consentState.analytics = consent.analytics !== false; // Default true
        consentState.marketing = consent.marketing || false;
        consentState.hasConsent = true;
        return true;
      } catch (e) {
        console.warn("[ZoriHQ] Failed to parse consent cookie");
      }
    }
    return false;
  }

  function setConsent(preferences) {
    if (!preferences || typeof preferences !== "object") {
      console.error("[ZoriHQ] setConsent requires an object");
      return false;
    }

    consentState.analytics = preferences.analytics !== false; // Default true
    consentState.marketing = preferences.marketing || false;
    consentState.hasConsent = true;

    const consentData = {
      analytics: consentState.analytics,
      marketing: consentState.marketing,
      timestamp: new Date().toISOString(),
    };

    setCookie(
      CONSENT_COOKIE_NAME,
      encodeURIComponent(JSON.stringify(consentData)),
      COOKIE_EXPIRY_DAYS,
    );

    console.log("[ZoriHQ] Consent preferences saved:", consentData);
    return true;
  }

  function hasTrackingConsent() {
    if (consentState.respectDNT && checkDoNotTrack()) {
      return false;
    }

    if (!consentState.hasConsent) {
      return true;
    }

    return consentState.analytics === true;
  }

  function optOut() {
    setConsent({ analytics: false, marketing: false });

    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

    try {
      localStorage.removeItem("zori_fp");
      localStorage.removeItem("zori_user_info");
      localStorage.removeItem("zori_session");
    } catch (e) {
      // localStorage not available
    }

    console.log("[ZoriHQ] Opted out of tracking");
    return true;
  }

  // ==================== SESSION MANAGEMENT ====================

  function getSession() {
    try {
      const storedSession = localStorage.getItem("zori_session");
      if (storedSession) {
        const session = JSON.parse(storedSession);
        const now = Date.now();
        const lastActivity = session.last_activity || 0;
        const currentUTM = getUTMHash();

        const isTimedOut = now - lastActivity > SESSION_TIMEOUT_MS;

        const hasNewUTM =
          currentUTM && session.utm_hash && currentUTM !== session.utm_hash;

        if (!isTimedOut && !hasNewUTM) {
          return session;
        }
      }
    } catch (e) {}
    return null;
  }

  function updateSessionActivity() {
    try {
      const session = getSession();
      if (session) {
        session.last_activity = Date.now();
        localStorage.setItem("zori_session", JSON.stringify(session));
      }
    } catch (e) {}
  }

  function createNewSession() {
    const sessionId = generateSessionId();
    const sessionData = {
      session_id: sessionId,
      started_at: Date.now(),
      last_activity: Date.now(),
      page_count: 0,
      utm_hash: getUTMHash(),
    };

    try {
      localStorage.setItem("zori_session", JSON.stringify(sessionData));
    } catch (e) {}

    document.cookie = `${SESSION_COOKIE_NAME}=${sessionId};path=/;SameSite=Lax`;

    trackSessionEvent("session_start", sessionId);

    return sessionData;
  }

  function getOrCreateSession() {
    const session = getSession();
    if (session) {
      return session.session_id;
    }

    const newSession = createNewSession();
    return newSession.session_id;
  }

  function incrementPageCount() {
    try {
      const session = getSession();
      if (session) {
        session.page_count = (session.page_count || 0) + 1;
        session.last_activity = Date.now();
        localStorage.setItem("zori_session", JSON.stringify(session));
      }
    } catch (e) {}
  }

  async function trackSessionEvent(eventType, sessionId) {
    const visitorId = await getOrCreateVisitorId();

    const eventData = {
      event_name: eventType,
      client_generated_event_id: generateEventId(),
      visitor_id: visitorId,
      session_id: sessionId,
      client_timestamp_utc: new Date().toISOString(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      page_url: window.location.pathname,
      host: window.location.host,
      utm_parameters: getUTMParameters(),
    };

    sendEvent(eventData);
  }

  function trackSessionEnd() {
    try {
      const session = getSession();
      if (session) {
        const duration = Date.now() - session.started_at;

        session.last_activity = Date.now();
        localStorage.setItem("zori_session", JSON.stringify(session));

        trackEvent("session_end", {
          duration_ms: duration,
          page_count: session.page_count || 0,
        });
      }
    } catch (e) {}
  }

  // ==================== EVENT TRACKING ====================

  async function sendEvent(eventData, endpoint = "/ingest") {
    try {
      const baseUrl = config.baseUrl.replace(/\/ingest$/, "");
      const url = baseUrl + endpoint;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Zori-PT": config.publishableKey,
          "X-Zori-Version": VERSION,
        },
        body: JSON.stringify(eventData),
        keepalive: true,
      });

      if (!response.ok) {
        console.warn(
          `[ZoriHQ] Failed to send event to ${endpoint}:`,
          response.status,
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error(`[ZoriHQ] Error sending event to ${endpoint}:`, error);
      return false;
    }
  }

  async function trackEvent(
    eventName,
    customProperties = {},
    clickData = null,
  ) {
    if (!hasTrackingConsent()) {
      console.log("[ZoriHQ] Tracking blocked: no consent or DNT enabled");
      return false;
    }

    const visitorId = await getOrCreateVisitorId();
    const sessionId = getOrCreateSession();

    updateSessionActivity();

    const eventData = {
      event_name: eventName,
      client_generated_event_id: generateEventId(),
      visitor_id: visitorId,
      session_id: sessionId,
      client_timestamp_utc: new Date().toISOString(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      page_url: window.location.pathname,
      host: window.location.host,
      utm_parameters: getUTMParameters(),
    };

    if (clickData) {
      if (clickData.element) {
        eventData.click_element = clickData.element;
      }
      if (clickData.position) {
        eventData.click_position = clickData.position;
      }
    }

    if (customProperties && Object.keys(customProperties).length > 0) {
      eventData.custom_properties = customProperties;
    }

    await sendEvent(eventData);
    return true;
  }

  async function identifyUser(userInfo) {
    if (!userInfo || typeof userInfo !== "object") {
      console.error(
        "[ZoriHQ] identifyUser requires an object with user information",
      );
      return false;
    }

    if (!hasTrackingConsent()) {
      console.log("[ZoriHQ] Identification blocked: no consent or DNT enabled");
      return false;
    }

    const visitorId = await getOrCreateVisitorId();
    const sessionId = getOrCreateSession();

    const identifyData = {
      visitor_id: visitorId,
      session_id: sessionId,
      client_timestamp_utc: new Date().toISOString(),
      user_agent: navigator.userAgent,
      page_url: window.location.pathname,
      host: window.location.host,
    };

    if (userInfo.app_id) {
      identifyData.app_id = userInfo.app_id;
    }

    if (userInfo.email) {
      identifyData.email = userInfo.email;
    }

    if (userInfo.fullname || userInfo.full_name) {
      identifyData.fullname = userInfo.fullname || userInfo.full_name;
    }

    const additionalProps = { ...userInfo };
    delete additionalProps.app_id;
    delete additionalProps.email;
    delete additionalProps.fullname;
    delete additionalProps.full_name;

    if (Object.keys(additionalProps).length > 0) {
      identifyData.additional_properties = additionalProps;
    }

    const success = await sendEvent(identifyData, "/identify");

    if (success) {
      try {
        localStorage.setItem(
          "zori_user_info",
          JSON.stringify({
            app_id: userInfo.app_id,
            email: userInfo.email,
            fullname: userInfo.fullname || userInfo.full_name,
            identified_at: new Date().toISOString(),
          }),
        );
      } catch (e) {}
    }

    return success;
  }

  // ==================== CLICK EVENT LISTENER ====================

  function setupClickTracking() {
    document.addEventListener(
      "click",
      async function (e) {
        const elementInfo = getClickElementInfo(e.target);

        await trackEvent(
          "click",
          {},
          {
            element: elementInfo,
            position: {
              x: e.clientX,
              y: e.clientY,
              screen_width: window.innerWidth,
              screen_height: window.innerHeight,
            },
          },
        );
      },
      true,
    );
  }

  // ==================== SCROLL DEPTH TRACKING ====================

  function getScrollMetrics() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );

    // Calculate scroll depth as percentage of total scrollable content
    const maxScroll = documentHeight - viewportHeight;
    const scrollPercent = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 100;

    // Calculate what percentage of the document is currently visible
    const visibleTop = (scrollTop / documentHeight) * 100;
    const visibleBottom = ((scrollTop + viewportHeight) / documentHeight) * 100;

    return {
      // Current scroll position normalized (0-100)
      scroll_depth_percent: Math.min(Math.round(scrollPercent), 100),
      // Document metrics for heatmap reconstruction
      document_height: documentHeight,
      viewport_height: viewportHeight,
      scroll_top: scrollTop,
      // Normalized positions for heatmaps (relative to document)
      visible_top_percent: Math.round(visibleTop * 100) / 100,
      visible_bottom_percent: Math.round(visibleBottom * 100) / 100,
      // Screen dimensions
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
    };
  }

  function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function (...args) {
      if (!lastRan) {
        func.apply(this, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(
          function () {
            if (Date.now() - lastRan >= limit) {
              func.apply(this, args);
              lastRan = Date.now();
            }
          },
          limit - (Date.now() - lastRan)
        );
      }
    };
  }

  async function handleScrollEvent() {
    const metrics = getScrollMetrics();
    const currentDepth = metrics.scroll_depth_percent;

    // Update max depth
    if (currentDepth > scrollState.maxDepthPercent) {
      scrollState.maxDepthPercent = currentDepth;
    }

    // Check for milestone intervals
    for (const interval of config.scrollDepthIntervals) {
      if (currentDepth >= interval && !scrollState.reachedIntervals.has(interval)) {
        scrollState.reachedIntervals.add(interval);

        await trackEvent("scroll_depth_milestone", {
          milestone_percent: interval,
          ...metrics,
        });
      }
    }

    // Store snapshot for heatmap data
    scrollState.scrollSnapshots.push({
      timestamp: Date.now(),
      ...metrics,
    });

    // Keep only last 100 snapshots to prevent memory issues
    if (scrollState.scrollSnapshots.length > 100) {
      scrollState.scrollSnapshots = scrollState.scrollSnapshots.slice(-100);
    }
  }

  function setupScrollTracking() {
    if (!config.trackScrollDepth) {
      return;
    }

    const throttledScrollHandler = throttle(
      handleScrollEvent,
      config.scrollThrottleMs
    );

    window.addEventListener("scroll", throttledScrollHandler, { passive: true });

    // Track scroll depth on page unload
    window.addEventListener("beforeunload", function () {
      if (scrollState.maxDepthPercent > 0) {
        const metrics = getScrollMetrics();

        trackEvent("scroll_depth_final", {
          max_depth_percent: scrollState.maxDepthPercent,
          milestones_reached: Array.from(scrollState.reachedIntervals),
          snapshot_count: scrollState.scrollSnapshots.length,
          ...metrics,
        });
      }
    });
  }

  function getScrollHeatmapData() {
    return {
      max_depth_percent: scrollState.maxDepthPercent,
      milestones_reached: Array.from(scrollState.reachedIntervals),
      snapshots: scrollState.scrollSnapshots,
      current_metrics: getScrollMetrics(),
    };
  }

  // ==================== SESSION RECORDING (RRWEB) ====================

  function loadRRWebScript() {
    return new Promise((resolve, reject) => {
      if (recordingState.rrwebLoaded || window.rrweb) {
        recordingState.rrwebLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = config.rrwebCdnUrl;
      script.async = true;

      script.onload = function () {
        recordingState.rrwebLoaded = true;
        console.log("[ZoriHQ] RRWeb loaded successfully");
        resolve();
      };

      script.onerror = function () {
        console.error("[ZoriHQ] Failed to load RRWeb script");
        reject(new Error("Failed to load RRWeb"));
      };

      document.head.appendChild(script);
    });
  }

  async function startSessionRecording(options = {}) {
    if (!hasTrackingConsent()) {
      console.log("[ZoriHQ] Session recording blocked: no consent or DNT enabled");
      return false;
    }

    if (recordingState.isRecording) {
      console.log("[ZoriHQ] Session recording already active");
      return true;
    }

    try {
      await loadRRWebScript();

      if (!window.rrweb || !window.rrweb.record) {
        console.error("[ZoriHQ] RRWeb not available");
        return false;
      }

      const recordingOptions = {
        emit: function (event) {
          recordingState.events.push(event);

          // Send events in batches (every 50 events or every 10 seconds)
          if (recordingState.events.length >= 50) {
            flushRecordingEvents();
          }
        },
        // Default options - can be overridden
        checkoutEveryNms: 10 * 60 * 1000, // Full snapshot every 10 minutes
        blockClass: "zori-block", // Block elements with this class
        ignoreClass: "zori-ignore", // Ignore input elements with this class
        maskTextClass: "zori-mask", // Mask text with this class
        maskAllInputs: true, // Mask all input values for privacy
        maskInputOptions: {
          password: true,
          email: true,
        },
        ...options,
      };

      recordingState.stopFn = window.rrweb.record(recordingOptions);
      recordingState.isRecording = true;

      // Set up periodic flush (every 10 seconds)
      recordingState.flushInterval = setInterval(function () {
        if (recordingState.events.length > 0) {
          flushRecordingEvents();
        }
      }, 10000);

      console.log("[ZoriHQ] Session recording started");

      // Track recording start event
      await trackEvent("session_recording_started", {
        recording_options: {
          maskAllInputs: recordingOptions.maskAllInputs,
        },
      });

      return true;
    } catch (error) {
      console.error("[ZoriHQ] Failed to start session recording:", error);
      return false;
    }
  }

  function stopSessionRecording() {
    if (!recordingState.isRecording) {
      return false;
    }

    if (recordingState.stopFn) {
      recordingState.stopFn();
    }

    if (recordingState.flushInterval) {
      clearInterval(recordingState.flushInterval);
    }

    // Flush remaining events
    if (recordingState.events.length > 0) {
      flushRecordingEvents();
    }

    recordingState.isRecording = false;
    recordingState.stopFn = null;

    console.log("[ZoriHQ] Session recording stopped");

    // Track recording stop event
    trackEvent("session_recording_stopped");

    return true;
  }

  async function flushRecordingEvents() {
    if (recordingState.events.length === 0) {
      return;
    }

    const eventsToSend = [...recordingState.events];
    recordingState.events = [];

    const visitorId = await getOrCreateVisitorId();
    const sessionId = getOrCreateSession();

    const payload = {
      event_name: "session_recording_events",
      client_generated_event_id: generateEventId(),
      visitor_id: visitorId,
      session_id: sessionId,
      client_timestamp_utc: new Date().toISOString(),
      page_url: window.location.pathname,
      host: window.location.host,
      recording_events: eventsToSend,
      event_count: eventsToSend.length,
    };

    await sendEvent(payload, "/recording");
  }

  function getRecordingStatus() {
    return {
      isRecording: recordingState.isRecording,
      eventCount: recordingState.events.length,
      rrwebLoaded: recordingState.rrwebLoaded,
    };
  }

  // ==================== PAGE VIEW TRACKING ====================

  async function trackPageView() {
    incrementPageCount();

    await trackEvent("page_view", {
      page_title: document.title,
      page_path: window.location.pathname,
      page_search: window.location.search,
      page_hash: window.location.hash,
    });
  }

  // ==================== QUEUE PROCESSING ====================

  function processQueuedCommands(queue) {
    if (!Array.isArray(queue)) {
      return;
    }

    queue.forEach((command) => {
      if (!Array.isArray(command) || command.length === 0) {
        console.warn("[ZoriHQ] Invalid queued command:", command);
        return;
      }

      const [method, ...args] = command;

      switch (method) {
        case "track":
          trackEvent(...args);
          break;
        case "identify":
          identifyUser(...args);
          break;
        case "getVisitorId":
          getOrCreateVisitorId().then((id) => {
            if (typeof args[0] === "function") {
              args[0](id); // Callback
            }
          });
          break;
        case "setConsent":
          setConsent(...args);
          break;
        case "optOut":
          optOut();
          break;
        case "startRecording":
          startSessionRecording(...args);
          break;
        case "stopRecording":
          stopSessionRecording();
          break;
        case "getScrollData":
          if (typeof args[0] === "function") {
            args[0](getScrollHeatmapData());
          }
          break;
        case "getRecordingStatus":
          if (typeof args[0] === "function") {
            args[0](getRecordingStatus());
          }
          break;
        default:
          console.warn(`[ZoriHQ] Unknown method: ${method}`);
      }
    });
  }

  // ==================== INITIALIZATION ====================

  async function init() {
    const queuedCommands = Array.isArray(window.ZoriHQ)
      ? [...window.ZoriHQ]
      : [];

    loadConsentState();

    if (!hasTrackingConsent()) {
      console.log("[ZoriHQ] Analytics disabled: no consent or DNT enabled");

      const api = {
        track: trackEvent,
        identify: identifyUser,
        getVisitorId: getOrCreateVisitorId,
        setConsent: setConsent,
        optOut: optOut,
        hasConsent: hasTrackingConsent,
        // Scroll tracking (no-op when no consent)
        getScrollData: () => null,
        // Session recording (no-op when no consent)
        startRecording: async () => false,
        stopRecording: () => false,
        getRecordingStatus: () => ({ isRecording: false, eventCount: 0, rrwebLoaded: false }),
        push: function (command) {
          if (Array.isArray(command)) {
            processQueuedCommands([command]);
          } else {
            console.warn("[ZoriHQ] push() expects an array");
          }
        },
      };
      window.ZoriHQ = api;
      return;
    }

    await getOrCreateVisitorId();

    getOrCreateSession();

    await trackPageView();

    setupClickTracking();

    setupScrollTracking();

    // Auto-start session recording if enabled
    if (config.enableSessionRecording) {
      startSessionRecording();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        pageHiddenAt = Date.now();

        if (config.trackQuickSwitches) {
          trackEvent("page_hidden");
        }
      } else if (document.visibilityState === "visible") {
        if (pageHiddenAt) {
          const hiddenDuration = Date.now() - pageHiddenAt;

          if (hiddenDuration > config.comebackThreshold) {
            trackEvent("user_comeback", {
              hidden_duration_ms: hiddenDuration,
              hidden_duration_seconds: Math.round(hiddenDuration / 1000),
            });
          } else if (config.trackQuickSwitches) {
            trackEvent("page_visible", {
              hidden_duration_ms: hiddenDuration,
            });
          }

          pageHiddenAt = null;
        } else if (config.trackQuickSwitches) {
          trackEvent("page_visible");
        }
      }
    });

    window.addEventListener("beforeunload", function () {
      if (document.visibilityState === "hidden" && pageHiddenAt) {
        const hiddenDuration = Date.now() - pageHiddenAt;
        trackEvent("left_while_hidden", {
          hidden_duration_ms: hiddenDuration,
          hidden_duration_seconds: Math.round(hiddenDuration / 1000),
        });
      }

      trackSessionEnd();
    });

    const api = {
      track: trackEvent,
      identify: identifyUser,
      getVisitorId: getOrCreateVisitorId,
      setConsent: setConsent,
      optOut: optOut,
      hasConsent: hasTrackingConsent,
      getSessionId: () => {
        const session = getSession();
        return session?.session_id || null;
      },
      // Scroll tracking API
      getScrollData: getScrollHeatmapData,
      // Session recording API
      startRecording: startSessionRecording,
      stopRecording: stopSessionRecording,
      getRecordingStatus: getRecordingStatus,
      push: function (command) {
        if (Array.isArray(command)) {
          processQueuedCommands([command]);
        } else {
          console.warn(
            "[ZoriHQ] push() expects an array, e.g., ['track', 'event_name']",
          );
        }
      },
    };

    window.ZoriHQ = api;

    processQueuedCommands(queuedCommands);

    console.log("[ZoriHQ] Analytics initialized with consent");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
