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
