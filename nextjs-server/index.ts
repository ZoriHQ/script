import { cookies, headers } from 'next/headers';

const VERSION = '1.0.0';
const COOKIE_NAME = 'zori_visitor_id';
const SESSION_COOKIE_NAME = 'zori_session_id';
const COOKIE_EXPIRY_DAYS = 365 * 2; // 2 years
const DEFAULT_API_URL = 'https://ingestion.zorihq.com/ingest';

// Types
export interface ZoriConfig {
  publishableKey: string;
  baseUrl?: string;
}

export interface UserInfo {
  app_id?: string;
  email?: string;
  fullname?: string;
  full_name?: string;
  [key: string]: any;
}

export interface TrackEventOptions {
  eventName: string;
  properties?: Record<string, any>;
  visitorId?: string;
  sessionId?: string;
  userAgent?: string;
  pageUrl?: string;
  host?: string;
  referrer?: string;
}

export interface IdentifyOptions {
  userInfo: UserInfo;
  visitorId?: string;
  sessionId?: string;
  userAgent?: string;
  pageUrl?: string;
  host?: string;
}

// Main Zori Server Class
export class ZoriServer {
  private config: Required<ZoriConfig>;

  constructor(config: ZoriConfig) {
    this.config = {
      publishableKey: config.publishableKey,
      baseUrl: config.baseUrl || DEFAULT_API_URL,
    };

    if (!this.config.publishableKey) {
      throw new Error('[ZoriHQ] publishableKey is required');
    }
  }

  /**
   * Generate a unique visitor ID
   */
  private generateVisitorId(): string {
    return (
      'vis_' +
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })
    );
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return (
      'ses_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).substring(2, 9)
    );
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get or create visitor ID from cookies
   */
  async getOrCreateVisitorId(): Promise<string> {
    const cookieStore = await cookies();
    let visitorId = cookieStore.get(COOKIE_NAME)?.value;

    if (!visitorId) {
      visitorId = this.generateVisitorId();
      cookieStore.set(COOKIE_NAME, visitorId, {
        maxAge: COOKIE_EXPIRY_DAYS * 24 * 60 * 60,
        path: '/',
        sameSite: 'lax',
      });
    }

    return visitorId;
  }

  /**
   * Get or create session ID from cookies
   */
  async getOrCreateSessionId(): Promise<string> {
    const cookieStore = await cookies();
    let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      sessionId = this.generateSessionId();
      cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
        path: '/',
        sameSite: 'lax',
      });
    }

    return sessionId;
  }

  /**
   * Get request metadata from Next.js headers
   */
  private async getRequestMetadata() {
    const headersList = await headers();
    return {
      userAgent: headersList.get('user-agent') || 'unknown',
      referrer: headersList.get('referer') || null,
      host: headersList.get('host') || 'unknown',
    };
  }

  /**
   * Extract UTM parameters from URL
   */
  private getUTMParameters(url: string): Record<string, string> | null {
    try {
      const urlObj = new URL(url);
      const utmParams: Record<string, string> = {};

      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((param) => {
        const value = urlObj.searchParams.get(param);
        if (value) {
          utmParams[param] = value;
        }
      });

      return Object.keys(utmParams).length > 0 ? utmParams : null;
    } catch {
      return null;
    }
  }

  /**
   * Send event to ingestion endpoint
   */
  private async sendEvent(eventData: any, endpoint: string = '/ingest'): Promise<boolean> {
    try {
      const baseUrl = this.config.baseUrl.replace(/\/ingest$/, '');
      const url = baseUrl + endpoint;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zori-PT': this.config.publishableKey,
          'X-Zori-Version': VERSION,
        },
        body: JSON.stringify(eventData),
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

  /**
   * Track a custom event
   */
  async track(options: TrackEventOptions): Promise<boolean> {
    const metadata = await this.getRequestMetadata();
    const visitorId = options.visitorId || (await this.getOrCreateVisitorId());
    const sessionId = options.sessionId || (await this.getOrCreateSessionId());

    const eventData = {
      event_name: options.eventName,
      client_generated_event_id: this.generateEventId(),
      visitor_id: visitorId,
      session_id: sessionId,
      client_timestamp_utc: new Date().toISOString(),
      user_agent: options.userAgent || metadata.userAgent,
      referrer: options.referrer || metadata.referrer,
      page_url: options.pageUrl || '/',
      host: options.host || metadata.host,
      utm_parameters: options.pageUrl ? this.getUTMParameters(options.pageUrl) : null,
    };

    if (options.properties && Object.keys(options.properties).length > 0) {
      (eventData as any).custom_properties = options.properties;
    }

    return await this.sendEvent(eventData);
  }

  /**
   * Identify a user
   */
  async identify(options: IdentifyOptions): Promise<boolean> {
    const metadata = await this.getRequestMetadata();
    const visitorId = options.visitorId || (await this.getOrCreateVisitorId());
    const sessionId = options.sessionId || (await this.getOrCreateSessionId());

    const identifyData: any = {
      visitor_id: visitorId,
      session_id: sessionId,
      client_timestamp_utc: new Date().toISOString(),
      user_agent: options.userAgent || metadata.userAgent,
      page_url: options.pageUrl || '/',
      host: options.host || metadata.host,
    };

    if (options.userInfo.app_id) {
      identifyData.app_id = options.userInfo.app_id;
    }

    if (options.userInfo.email) {
      identifyData.email = options.userInfo.email;
    }

    if (options.userInfo.fullname || options.userInfo.full_name) {
      identifyData.fullname = options.userInfo.fullname || options.userInfo.full_name;
    }

    const additionalProps = { ...options.userInfo };
    delete additionalProps.app_id;
    delete additionalProps.email;
    delete additionalProps.fullname;
    delete additionalProps.full_name;

    if (Object.keys(additionalProps).length > 0) {
      identifyData.additional_properties = additionalProps;
    }

    return await this.sendEvent(identifyData, '/identify');
  }

  /**
   * Get the current visitor ID
   */
  async getVisitorId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value || null;
  }

  /**
   * Get the current session ID
   */
  async getSessionId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  }
}

// Export a factory function for easier usage
export function createZoriServer(config: ZoriConfig): ZoriServer {
  return new ZoriServer(config);
}

export default ZoriServer;
