(function () {
  "use strict";

  // Configuration
  const VERSION = "1.0.0";
  const COOKIE_NAME = "zori_visitor_id";
  const SESSION_COOKIE_NAME = "zori_session_id";
  const CONSENT_COOKIE_NAME = "zori_consent";
  const COOKIE_EXPIRY_DAYS = 365 * 2; // 2 years
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const DEFAULT_API_URL = "https://ingestion.zorihq.com/ingest";

  // Consent state
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
  };

  if (!config.publishableKey) {
    console.error("[ZoriHQ] Missing data-key attribute");
    return;
  }

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

    // If element has an ID, use it (most specific)
    if (element.id) {
      return `#${element.id}`;
    }

    // Build a shorter, more meaningful selector
    let selector = element.nodeName.toLowerCase();

    // Add classes if available (limit to first 2 most relevant)
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

    // Look for the closest parent with an ID (within 3 levels)
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

    // Get text content (limit to 100 chars)
    const text = element.textContent?.trim() || "";
    if (text.length > 0) {
      info.text = text.substring(0, 100);
    }

    // Check if it's a link
    if (element.tagName === "A") {
      info.type = "link";
      info.href = element.href || null;
      info.target = element.target || null;
    }
    // Check if it's a button
    else if (
      element.tagName === "BUTTON" ||
      element.getAttribute("role") === "button"
    ) {
      info.type = "button";
      info.button_type = element.type || "button";
    }
    // Check if it's an input
    else if (element.tagName === "INPUT") {
      info.type = "input";
      info.input_type = element.type || "text";
    }
    // Check if it's a clickable element with a click handler
    else if (
      element.onclick ||
      element.getAttribute("onclick") ||
      window.getComputedStyle(element).cursor === "pointer"
    ) {
      info.type = "clickable";
    } else {
      // Check if parent is a link (common pattern: clicking on element inside <a>)
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

    // Get data attributes (if any)
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

    // Screen properties
    fp.screen_resolution = `${window.screen.width}x${window.screen.height}`;
    fp.screen_color_depth = window.screen.colorDepth;
    fp.screen_pixel_depth = window.screen.pixelDepth;
    fp.viewport_size = `${window.innerWidth}x${window.innerHeight}`;
    fp.screen_orientation = window.screen.orientation?.type || "unknown";

    // Browser properties
    fp.user_agent = navigator.userAgent;
    fp.platform = navigator.platform;
    fp.language = navigator.language;
    fp.languages = navigator.languages ? navigator.languages.join(",") : "";
    fp.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fp.timezone_offset = new Date().getTimezoneOffset();

    // Hardware
    fp.hardware_concurrency = navigator.hardwareConcurrency || "unknown";
    fp.device_memory = navigator.deviceMemory || "unknown";
    fp.max_touch_points = navigator.maxTouchPoints || 0;

    // Browser capabilities
    fp.cookies_enabled = navigator.cookieEnabled;
    fp.do_not_track = navigator.doNotTrack || "unknown";
    fp.local_storage = typeof Storage !== "undefined";
    fp.session_storage = typeof Storage !== "undefined";
    fp.indexed_db = !!window.indexedDB;

    // Plugins
    if (navigator.plugins && navigator.plugins.length > 0) {
      fp.plugins = Array.from(navigator.plugins)
        .map((p) => p.name)
        .sort()
        .join(",");
    } else {
      fp.plugins = "none";
    }

    // Canvas fingerprint
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

    // WebGL fingerprint
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

    // Audio context fingerprint
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

    // Media devices
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

    // Connection info
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

    // Battery (if available)
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

    // Generate hash from all fingerprint data
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

      // Store fingerprint on first visit
      const fingerprint = await generateFingerprint();
      try {
        localStorage.setItem("zori_fp", JSON.stringify(fingerprint));
      } catch (e) {
        // localStorage not available
      }
    }

    return visitorId;
  }

  // ==================== CONSENT MANAGEMENT ====================

  function checkDoNotTrack() {
    // Check Do Not Track header
    const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
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

    // Save to cookie
    const consentData = {
      analytics: consentState.analytics,
      marketing: consentState.marketing,
      timestamp: new Date().toISOString(),
    };

    setCookie(
      CONSENT_COOKIE_NAME,
      encodeURIComponent(JSON.stringify(consentData)),
      COOKIE_EXPIRY_DAYS
    );

    console.log("[ZoriHQ] Consent preferences saved:", consentData);
    return true;
  }

  function hasTrackingConsent() {
    // Check DNT first if configured to respect it
    if (consentState.respectDNT && checkDoNotTrack()) {
      return false;
    }

    // If no consent has been explicitly set, allow analytics by default
    // (You may want to change this based on your privacy policy)
    if (!consentState.hasConsent) {
      return true; // Implicit consent (change to false for opt-in only)
    }

    return consentState.analytics === true;
  }

  function optOut() {
    // Disable all tracking
    setConsent({ analytics: false, marketing: false });

    // Clear visitor ID and session
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

    // Clear localStorage
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

        // Check if session is still valid
        const isTimedOut = now - lastActivity > SESSION_TIMEOUT_MS;
        const hasNewUTM = currentUTM && currentUTM !== session.utm_hash;

        if (!isTimedOut && !hasNewUTM) {
          return session;
        }
      }
    } catch (e) {
      // localStorage not available
    }
    return null;
  }

  function updateSessionActivity() {
    try {
      const session = getSession();
      if (session) {
        session.last_activity = Date.now();
        localStorage.setItem("zori_session", JSON.stringify(session));
      }
    } catch (e) {
      // localStorage not available
    }
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
    } catch (e) {
      // localStorage not available
    }

    // Also set a session cookie (expires when browser closes)
    document.cookie = `${SESSION_COOKIE_NAME}=${sessionId};path=/;SameSite=Lax`;

    // Track session start
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
    } catch (e) {
      // localStorage not available
    }
  }

  async function trackSessionEvent(eventType, sessionId) {
    // Internal function to track session events without recursion
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

  function endSession() {
    try {
      const storedSession = localStorage.getItem("zori_session");
      if (storedSession) {
        const session = JSON.parse(storedSession);
        const duration = Date.now() - session.started_at;

        // Track session end with duration
        trackEvent("session_end", {
          duration_ms: duration,
          page_count: session.page_count || 1,
        });

        // Clear session
        localStorage.removeItem("zori_session");
      }
    } catch (e) {
      // localStorage not available
    }

    // Clear session cookie
    document.cookie = `${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
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
        console.warn(`[ZoriHQ] Failed to send event to ${endpoint}:`, response.status);
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
    // Check consent before tracking
    if (!hasTrackingConsent()) {
      console.log("[ZoriHQ] Tracking blocked: no consent or DNT enabled");
      return false;
    }

    const visitorId = await getOrCreateVisitorId();
    const sessionId = getOrCreateSession();

    // Update session activity timestamp (but don't increment page_count)
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

    // Add click data if available
    if (clickData) {
      if (clickData.element) {
        eventData.click_element = clickData.element;
      }
      if (clickData.position) {
        eventData.click_position = clickData.position;
      }
    }

    // Add custom properties if provided
    if (customProperties && Object.keys(customProperties).length > 0) {
      eventData.custom_properties = customProperties;
    }

    await sendEvent(eventData);
    return true;
  }

  async function identifyUser(userInfo) {
    if (!userInfo || typeof userInfo !== "object") {
      console.error("[ZoriHQ] identifyUser requires an object with user information");
      return false;
    }

    // Check consent before identifying
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

    // Add user info fields
    if (userInfo.app_id) {
      identifyData.app_id = userInfo.app_id;
    }

    if (userInfo.email) {
      identifyData.email = userInfo.email;
    }

    if (userInfo.fullname || userInfo.full_name) {
      identifyData.fullname = userInfo.fullname || userInfo.full_name;
    }

    // Add any additional properties
    const additionalProps = { ...userInfo };
    delete additionalProps.app_id;
    delete additionalProps.email;
    delete additionalProps.fullname;
    delete additionalProps.full_name;

    if (Object.keys(additionalProps).length > 0) {
      identifyData.additional_properties = additionalProps;
    }

    const success = await sendEvent(identifyData, "/identify");

    // Store user info locally for subsequent events
    if (success) {
      try {
        localStorage.setItem("zori_user_info", JSON.stringify({
          app_id: userInfo.app_id,
          email: userInfo.email,
          fullname: userInfo.fullname || userInfo.full_name,
          identified_at: new Date().toISOString(),
        }));
      } catch (e) {
        // localStorage not available
      }
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

  // ==================== PAGE VIEW TRACKING ====================

  async function trackPageView() {
    // Increment page count only on page views
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
        default:
          console.warn(`[ZoriHQ] Unknown method: ${method}`);
      }
    });
  }

  // ==================== INITIALIZATION ====================

  async function init() {
    // Capture any commands that were queued before script loaded
    const queuedCommands = Array.isArray(window.ZoriHQ) ? [...window.ZoriHQ] : [];

    // Load consent state from cookie
    loadConsentState();

    // Check if tracking is allowed
    if (!hasTrackingConsent()) {
      console.log("[ZoriHQ] Analytics disabled: no consent or DNT enabled");

      // Still expose API for later consent grant
      const api = {
        track: trackEvent,
        identify: identifyUser,
        getVisitorId: getOrCreateVisitorId,
        setConsent: setConsent,
        optOut: optOut,
        hasConsent: hasTrackingConsent,
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

    // Ensure visitor ID is set
    await getOrCreateVisitorId();

    // Initialize session
    getOrCreateSession();

    // Track initial page view
    await trackPageView();

    // Setup click tracking
    setupClickTracking();

    // Track page visibility changes (but don't end session)
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        trackEvent("page_hidden");
      } else if (document.visibilityState === "visible") {
        trackEvent("page_visible");
      }
    });

    // Create API object with push support for future commands
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
      push: function (command) {
        // Allow continued use of push() after initialization
        if (Array.isArray(command)) {
          processQueuedCommands([command]);
        } else {
          console.warn("[ZoriHQ] push() expects an array, e.g., ['track', 'event_name']");
        }
      },
    };

    // Replace array with API object
    window.ZoriHQ = api;

    // Process any commands that were queued before script loaded
    processQueuedCommands(queuedCommands);

    console.log("[ZoriHQ] Analytics initialized with consent");
  }

  // Start tracking when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
