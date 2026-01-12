/**
 * Shared TypeScript types for ZoriHQ SDKs
 * These types are reused across React, Next.js, Vue, Svelte, and server-side implementations
 */

// =============================================================================
// Core Configuration Types
// =============================================================================

/**
 * Configuration options for ZoriHQ client-side SDKs
 */
export interface ZoriConfig {
  /** Your ZoriHQ publishable key */
  publishableKey: string;
  /** Custom API base URL (optional) */
  baseUrl?: string;
  /** Threshold in ms for detecting user comebacks (optional) */
  comebackThreshold?: number;
  /** Whether to track quick tab switches (optional) */
  trackQuickSwitches?: boolean;
  /** Whether to track scroll depth (default: true) */
  trackScrollDepth?: boolean;
  /** Throttle interval for scroll events in ms (default: 250) */
  scrollThrottleMs?: number;
  /** Scroll depth milestones to track (default: [25, 50, 75, 90, 100]) */
  scrollDepthIntervals?: number[];
  /** Whether to enable session recording (default: false) */
  enableSessionRecording?: boolean;
  /** Custom CDN URL for RRWeb script */
  rrwebCdnUrl?: string;
}

/**
 * Configuration options for ZoriHQ server-side SDK
 * A subset of ZoriConfig without client-specific options
 */
export interface ZoriServerConfig {
  /** Your ZoriHQ publishable key */
  publishableKey: string;
  /** Custom API base URL (optional) */
  baseUrl?: string;
}

// =============================================================================
// User & Consent Types
// =============================================================================

/**
 * User consent preferences for tracking
 */
export interface ConsentPreferences {
  /** Whether analytics tracking is allowed */
  analytics?: boolean;
  /** Whether marketing tracking is allowed */
  marketing?: boolean;
}

/**
 * User identification information
 */
export interface UserInfo {
  /** Application-specific user ID */
  app_id?: string;
  /** User's email address */
  email?: string;
  /** User's full name (alternative 1) */
  fullname?: string;
  /** User's full name (alternative 2) */
  full_name?: string;
  /** Additional custom properties */
  [key: string]: any;
}

// =============================================================================
// Scroll Tracking Types
// =============================================================================

/**
 * Scroll metrics for heatmap generation
 */
export interface ScrollMetrics {
  /** Current scroll depth as percentage (0-100) */
  scroll_depth_percent: number;
  /** Total document height in pixels */
  document_height: number;
  /** Viewport height in pixels */
  viewport_height: number;
  /** Current scroll position from top in pixels */
  scroll_top: number;
  /** Top of visible area as percentage of document (0-100) */
  visible_top_percent: number;
  /** Bottom of visible area as percentage of document (0-100) */
  visible_bottom_percent: number;
  /** Screen/viewport width in pixels */
  screen_width: number;
  /** Screen/viewport height in pixels */
  screen_height: number;
}

/**
 * Scroll snapshot with timestamp
 */
export interface ScrollSnapshot extends ScrollMetrics {
  /** Timestamp when this snapshot was taken */
  timestamp: number;
}

/**
 * Complete scroll heatmap data
 */
export interface ScrollHeatmapData {
  /** Maximum scroll depth reached (percentage) */
  max_depth_percent: number;
  /** Array of milestone percentages that were reached */
  milestones_reached: number[];
  /** Array of scroll snapshots for detailed analysis */
  snapshots: ScrollSnapshot[];
  /** Current scroll metrics */
  current_metrics: ScrollMetrics;
}

// =============================================================================
// Session Recording Types
// =============================================================================

/**
 * Session recording status
 */
export interface RecordingStatus {
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Number of events in the current buffer */
  eventCount: number;
  /** Whether the RRWeb library has been loaded */
  rrwebLoaded: boolean;
}

/**
 * Options for starting session recording
 */
export interface RecordingOptions {
  /** Time in ms between full DOM snapshots (default: 10 minutes) */
  checkoutEveryNms?: number;
  /** CSS class to block from recording */
  blockClass?: string;
  /** CSS class to ignore input values */
  ignoreClass?: string;
  /** CSS class to mask text content */
  maskTextClass?: string;
  /** Mask all input values for privacy (default: true) */
  maskAllInputs?: boolean;
  /** Specific input types to mask */
  maskInputOptions?: {
    password?: boolean;
    email?: boolean;
    [key: string]: boolean | undefined;
  };
}

// =============================================================================
// Core API Interface
// =============================================================================

/**
 * Core API methods shared across all ZoriHQ client SDKs
 * Framework-specific implementations extend or implement this interface
 */
export interface ZoriCoreAPI {
  /** Track a custom event */
  track: (eventName: string, properties?: Record<string, any>) => Promise<boolean>;
  /** Identify a user */
  identify: (userInfo: UserInfo) => Promise<boolean>;
  /** Get the current visitor ID */
  getVisitorId: () => Promise<string>;
  /** Get the current session ID */
  getSessionId: () => string | null;
  /** Set user consent preferences */
  setConsent: (preferences: ConsentPreferences) => boolean;
  /** Opt out of all tracking */
  optOut: () => boolean;
  /** Check if user has given consent */
  hasConsent: () => boolean;
  /** Get scroll heatmap data */
  getScrollData: () => ScrollHeatmapData | null;
  /** Start session recording */
  startRecording: (options?: RecordingOptions) => Promise<boolean>;
  /** Stop session recording */
  stopRecording: () => boolean;
  /** Get current recording status */
  getRecordingStatus: () => RecordingStatus;
}

// =============================================================================
// Server-Side Types
// =============================================================================

/**
 * Options for tracking events on the server side
 */
export interface TrackEventOptions {
  /** Name of the event to track */
  eventName: string;
  /** Custom properties to attach to the event */
  properties?: Record<string, any>;
  /** Override visitor ID (optional, auto-generated if not provided) */
  visitorId?: string;
  /** Override session ID (optional, auto-generated if not provided) */
  sessionId?: string;
  /** User agent string */
  userAgent?: string;
  /** Full page URL */
  pageUrl?: string;
  /** Host/domain name */
  host?: string;
  /** Referrer URL */
  referrer?: string;
}

/**
 * Options for identifying users on the server side
 */
export interface IdentifyOptions {
  /** User information to associate with the visitor */
  userInfo: UserInfo;
  /** Override visitor ID (optional, auto-generated if not provided) */
  visitorId?: string;
  /** Override session ID (optional, auto-generated if not provided) */
  sessionId?: string;
  /** User agent string */
  userAgent?: string;
  /** Full page URL */
  pageUrl?: string;
  /** Host/domain name */
  host?: string;
}
