(function () {
  "use strict";

  // Configuration
  const VERSION = "1.0.0";
  const COOKIE_NAME = "zori_visitor_id";
  const COOKIE_EXPIRY_DAYS = 365 * 2; // 2 years
  const DEFAULT_API_URL = "https://ingestion.zorihq.com/ingest";

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

  function getCSSSelector(element) {
    if (!element) return null;

    // If element has an ID, use it
    if (element.id) {
      return `#${element.id}`;
    }

    // Build path from classes and tag name
    let path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();

      if (element.className && typeof element.className === "string") {
        const classes = element.className
          .trim()
          .split(/\s+/)
          .filter((c) => c);
        if (classes.length > 0) {
          selector += "." + classes.join(".");
        }
      }

      // Add nth-child if needed for uniqueness
      let sibling = element;
      let nth = 1;
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling;
        if (sibling.nodeName === element.nodeName) nth++;
      }

      if (
        nth > 1 ||
        (element.parentNode && element.parentNode.children.length > 1)
      ) {
        selector += `:nth-child(${nth})`;
      }

      path.unshift(selector);
      element = element.parentNode;

      // Stop at body or after reasonable depth
      if (!element || element.nodeName === "BODY" || path.length > 5) break;
    }

    return path.join(" > ");
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

  // ==================== EVENT TRACKING ====================

  async function sendEvent(eventData) {
    try {
      const response = await fetch(config.baseUrl, {
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
        console.warn("[ZoriHQ] Failed to send event:", response.status);
      }
    } catch (error) {
      console.error("[ZoriHQ] Error sending event:", error);
    }
  }

  async function trackEvent(
    eventName,
    customProperties = {},
    clickData = null,
  ) {
    const visitorId = await getOrCreateVisitorId();

    const eventData = {
      event_name: eventName,
      client_generated_event_id: generateEventId(),
      visitor_id: visitorId,
      client_timestamp_utc: new Date().toISOString(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      page_url: window.location.pathname,
      host: window.location.host,
      utm_parameters: getUTMParameters(),
    };

    // Add click data if available
    if (clickData) {
      eventData.click_on = clickData.selector;
      eventData.click_position = clickData.position;
    }

    // Add custom properties if provided
    if (customProperties && Object.keys(customProperties).length > 0) {
      eventData.custom_properties = customProperties;
    }

    await sendEvent(eventData);
  }

  // ==================== CLICK EVENT LISTENER ====================

  function setupClickTracking() {
    document.addEventListener(
      "click",
      async function (e) {
        const selector = getCSSSelector(e.target);
        const position = [e.clientX, e.clientY];

        await trackEvent(
          "click",
          {},
          {
            selector: selector,
            position: position,
          },
        );
      },
      true,
    );
  }

  // ==================== PAGE VIEW TRACKING ====================

  async function trackPageView() {
    await trackEvent("page_view", {
      page_title: document.title,
      page_path: window.location.pathname,
      page_search: window.location.search,
      page_hash: window.location.hash,
    });
  }

  // ==================== INITIALIZATION ====================

  async function init() {
    // Ensure visitor ID is set
    await getOrCreateVisitorId();

    // Track initial page view
    await trackPageView();

    // Setup click tracking
    setupClickTracking();

    // Track page visibility changes
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        trackEvent("page_hidden");
      } else if (document.visibilityState === "visible") {
        trackEvent("page_visible");
      }
    });

    // Track page unload
    window.addEventListener("beforeunload", function () {
      trackEvent("page_unload");
    });

    // Expose global API
    window.ZoriHQ = {
      track: trackEvent,
      identify: function (userId, traits) {
        trackEvent("identify", { user_id: userId, traits: traits });
      },
    };

    console.log("[ZoriHQ] Analytics initialized");
  }

  // Start tracking when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
