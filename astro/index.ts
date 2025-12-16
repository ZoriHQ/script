/**
 * ZoriHQ Analytics for Astro
 *
 * Client-side utilities for tracking events, identifying users,
 * and managing analytics in Astro applications.
 */

import type { ZoriConfig, ConsentPreferences, UserInfo, ZoriCoreAPI } from '@zorihq/types';

// Re-export shared types for convenience
export type { ZoriConfig, ConsentPreferences, UserInfo } from '@zorihq/types';

// Extend Window interface for ZoriHQ
declare global {
  interface Window {
    ZoriHQ: any;
    __zoriInitialPageTracked?: boolean;
  }
}

/**
 * Get the ZoriHQ instance from window
 */
function getZori(): any {
  if (typeof window === 'undefined') return null;
  return window.ZoriHQ;
}

/**
 * Track a custom event
 * @param eventName - Name of the event to track
 * @param properties - Optional properties to attach to the event
 * @returns Promise resolving to true if tracking was successful
 */
export async function track(eventName: string, properties?: Record<string, any>): Promise<boolean> {
  const zori = getZori();
  if (!zori) return false;

  if (typeof zori.track === 'function') {
    return await zori.track(eventName, properties);
  } else {
    zori.push(['track', eventName, properties]);
    return true;
  }
}

/**
 * Identify a user with their information
 * @param userInfo - User information to associate with the visitor
 * @returns Promise resolving to true if identification was successful
 */
export async function identify(userInfo: UserInfo): Promise<boolean> {
  const zori = getZori();
  if (!zori) return false;

  if (typeof zori.identify === 'function') {
    return await zori.identify(userInfo);
  } else {
    zori.push(['identify', userInfo]);
    return true;
  }
}

/**
 * Get the current visitor ID
 * @returns Promise resolving to the visitor ID string
 */
export async function getVisitorId(): Promise<string> {
  const zori = getZori();
  if (!zori) return '';

  if (typeof zori.getVisitorId === 'function') {
    return await zori.getVisitorId();
  }

  return new Promise<string>((resolve) => {
    zori.push(['getVisitorId', (id: string) => resolve(id)]);
  });
}

/**
 * Get the current session ID
 * @returns The session ID or null if not available
 */
export function getSessionId(): string | null {
  const zori = getZori();
  if (!zori || typeof zori.getSessionId !== 'function') return null;
  return zori.getSessionId();
}

/**
 * Set user consent preferences
 * @param preferences - Consent preferences object
 * @returns true if consent was set successfully
 */
export function setConsent(preferences: ConsentPreferences): boolean {
  const zori = getZori();
  if (!zori) return false;

  if (typeof zori.setConsent === 'function') {
    return zori.setConsent(preferences);
  } else {
    zori.push(['setConsent', preferences]);
    return true;
  }
}

/**
 * Opt out of all tracking
 * @returns true if opt-out was successful
 */
export function optOut(): boolean {
  const zori = getZori();
  if (!zori) return false;

  if (typeof zori.optOut === 'function') {
    return zori.optOut();
  } else {
    zori.push(['optOut']);
    return true;
  }
}

/**
 * Check if user has given consent
 * @returns true if user has given consent
 */
export function hasConsent(): boolean {
  const zori = getZori();
  if (!zori || typeof zori.hasConsent !== 'function') return true;
  return zori.hasConsent();
}

/**
 * Check if ZoriHQ script is loaded and initialized
 * @returns true if the script is fully initialized
 */
export function isInitialized(): boolean {
  const zori = getZori();
  return zori && typeof zori.track === 'function';
}

/**
 * Wait for ZoriHQ to be initialized
 * @param timeout - Maximum time to wait in ms (default: 5000)
 * @returns Promise that resolves when initialized or rejects on timeout
 */
export function waitForInit(timeout: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isInitialized()) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isInitialized()) {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('ZoriHQ initialization timeout'));
      }
    }, 100);
  });
}

/**
 * Track a page view manually
 * Useful when auto-tracking is disabled or for custom page view tracking
 * @param properties - Optional additional properties
 */
export async function trackPageView(properties?: Record<string, any>): Promise<boolean> {
  return track('page_view', {
    page_title: typeof document !== 'undefined' ? document.title : '',
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    page_search: typeof window !== 'undefined' ? window.location.search : '',
    page_hash: typeof window !== 'undefined' ? window.location.hash : '',
    ...properties,
  });
}

/**
 * Create a click tracking handler
 * @param eventName - Name of the event to track (default: 'click')
 * @param properties - Properties to attach to the event
 * @returns Click handler function
 */
export function createClickHandler(
  eventName: string = 'click',
  properties?: Record<string, any>
): (event: Event) => void {
  return (event: Event) => {
    track(eventName, properties);
  };
}

/**
 * ZoriHQ API object implementing ZoriCoreAPI interface
 * Provides a unified API for all tracking operations
 */
export const zori: ZoriCoreAPI = {
  track,
  identify,
  getVisitorId,
  getSessionId,
  setConsent,
  optOut,
  hasConsent,
};

export default zori;
