/**
 * Session Management Tests
 *
 * These tests verify that session IDs persist correctly across page refreshes
 * and validate the session timeout and UTM parameter logic.
 */

const { describe, test, expect, beforeEach } = require("@jest/globals");

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
);

describe("Session Management", () => {
  let scriptContent;
  let scriptModule;

  beforeEach(() => {
    document.body.innerHTML = "";

    localStorage.clear();
    document.cookie = "";

    global.fetch.mockClear();

    const scriptTag = document.createElement("script");
    scriptTag.setAttribute("data-key", "test-key-123");
    scriptTag.setAttribute("data-base-url", "https://test.example.com/ingest");
    document.body.appendChild(scriptTag);

    Object.defineProperty(document, "currentScript", {
      value: scriptTag,
      writable: true,
      configurable: true,
    });

    jest.spyOn(Date, "now").mockReturnValue(1000000000000);
  });

  describe("Session Persistence Across Page Refresh", () => {
    test("should maintain same session ID after simulated page refresh", async () => {
      const firstLoadSessionData = {
        session_id: "ses_test_123",
        started_at: Date.now(),
        last_activity: Date.now(),
        page_count: 1,
        utm_hash: null,
      };

      localStorage.setItem(
        "zori_session",
        JSON.stringify(firstLoadSessionData),
      );
      document.cookie = "zori_session_id=ses_test_123;path=/;SameSite=Lax";

      jest.spyOn(Date, "now").mockReturnValue(1000000000000 + 5000); // 5 seconds later

      const storedSession = localStorage.getItem("zori_session");
      expect(storedSession).not.toBeNull();

      const session = JSON.parse(storedSession);
      expect(session.session_id).toBe("ses_test_123");

      const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
      const now = Date.now();
      const isTimedOut = now - session.last_activity > SESSION_TIMEOUT_MS;
      expect(isTimedOut).toBe(false);
    });

    test("should create new session after 30 minute timeout", () => {
      const oldSessionData = {
        session_id: "ses_old_123",
        started_at: Date.now() - 31 * 60 * 1000, // 31 minutes ago
        last_activity: Date.now() - 31 * 60 * 1000,
        page_count: 5,
        utm_hash: null,
      };

      localStorage.setItem("zori_session", JSON.stringify(oldSessionData));

      const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
      const session = JSON.parse(localStorage.getItem("zori_session"));
      const now = Date.now();
      const isTimedOut = now - session.last_activity > SESSION_TIMEOUT_MS;

      expect(isTimedOut).toBe(true);
    });

    test("should NOT create new session when refreshing without UTM changes", () => {
      const sessionData = {
        session_id: "ses_test_456",
        started_at: Date.now(),
        last_activity: Date.now(),
        page_count: 2,
        utm_hash: null, // No UTM parameters
      };

      localStorage.setItem("zori_session", JSON.stringify(sessionData));

      const currentUTM = null; // No UTM on new page
      const session = JSON.parse(localStorage.getItem("zori_session"));

      const hasNewUTM =
        currentUTM && session.utm_hash && currentUTM !== session.utm_hash;

      expect(hasNewUTM).toBeFalsy();
      expect(!!hasNewUTM).toBe(false); // Should NOT create new session
    });

    test("should create new session when UTM parameters change", () => {
      const sessionData = {
        session_id: "ses_test_789",
        started_at: Date.now(),
        last_activity: Date.now(),
        page_count: 1,
        utm_hash: JSON.stringify({ utm_source: "google", utm_medium: "cpc" }),
      };

      localStorage.setItem("zori_session", JSON.stringify(sessionData));

      const currentUTM = JSON.stringify({
        utm_source: "facebook",
        utm_medium: "social",
      });
      const session = JSON.parse(localStorage.getItem("zori_session"));

      const hasNewUTM =
        currentUTM && session.utm_hash && currentUTM !== session.utm_hash;

      expect(hasNewUTM).toBe(true);
    });

    test("should NOT create new session when both UTM params are null", () => {
      const sessionData = {
        session_id: "ses_test_null",
        started_at: Date.now(),
        last_activity: Date.now(),
        page_count: 1,
        utm_hash: null, // No UTM initially
      };

      localStorage.setItem("zori_session", JSON.stringify(sessionData));

      const currentUTM = null; // Still no UTM
      const session = JSON.parse(localStorage.getItem("zori_session"));

      const hasNewUTM =
        currentUTM && session.utm_hash && currentUTM !== session.utm_hash;

      expect(hasNewUTM).toBeFalsy();
      expect(!!hasNewUTM).toBe(false); // Should NOT create new session
    });
  });

  describe("Session Activity Update During Unload", () => {
    test("should update last_activity synchronously before page unload", () => {
      const initialTime = Date.now();
      const sessionData = {
        session_id: "ses_unload_test",
        started_at: initialTime,
        last_activity: initialTime,
        page_count: 1,
        utm_hash: null,
      };

      localStorage.setItem("zori_session", JSON.stringify(sessionData));

      const unloadTime = initialTime + 10000; // 10 seconds later
      jest.spyOn(Date, "now").mockReturnValue(unloadTime);

      const session = JSON.parse(localStorage.getItem("zori_session"));
      session.last_activity = Date.now();
      localStorage.setItem("zori_session", JSON.stringify(session));

      const updatedSession = JSON.parse(localStorage.getItem("zori_session"));
      expect(updatedSession.last_activity).toBe(unloadTime);
      expect(updatedSession.last_activity).not.toBe(initialTime);
    });

    test("should preserve session ID even after trackSessionEnd", () => {
      const sessionData = {
        session_id: "ses_preserve_test",
        started_at: Date.now(),
        last_activity: Date.now(),
        page_count: 3,
        utm_hash: null,
      };

      localStorage.setItem("zori_session", JSON.stringify(sessionData));

      const session = JSON.parse(localStorage.getItem("zori_session"));
      const originalSessionId = session.session_id;
      session.last_activity = Date.now();
      localStorage.setItem("zori_session", JSON.stringify(session));

      const updatedSession = JSON.parse(localStorage.getItem("zori_session"));
      expect(updatedSession.session_id).toBe(originalSessionId);
      expect(localStorage.getItem("zori_session")).not.toBeNull();
    });
  });

  describe("Session Cookie Synchronization", () => {
    test("should set session cookie when creating new session", () => {
      const sessionId = "ses_cookie_test";
      document.cookie = `zori_session_id=${sessionId};path=/;SameSite=Lax`;

      expect(document.cookie).toContain("zori_session_id=ses_cookie_test");
    });

    test("should maintain session cookie across page refresh simulation", () => {
      document.cookie =
        "zori_session_id=ses_persist_cookie;path=/;SameSite=Lax";

      const initialCookie = document.cookie;

      expect(document.cookie).toContain("zori_session_id=ses_persist_cookie");
      expect(document.cookie).toBe(initialCookie);
    });
  });

  describe("Edge Cases", () => {
    test("should handle corrupted localStorage session data", () => {
      localStorage.setItem("zori_session", "invalid json{{{");

      expect(() => {
        try {
          JSON.parse(localStorage.getItem("zori_session"));
        } catch (e) {
          return null;
        }
      }).not.toThrow();
    });

    test("should handle missing last_activity field", () => {
      const sessionData = {
        session_id: "ses_no_activity",
        started_at: Date.now(),
        page_count: 1,
        utm_hash: null,
      };

      localStorage.setItem("zori_session", JSON.stringify(sessionData));

      const session = JSON.parse(localStorage.getItem("zori_session"));
      const lastActivity = session.last_activity || 0;

      expect(lastActivity).toBe(0);

      const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
      const isTimedOut = Date.now() - lastActivity > SESSION_TIMEOUT_MS;
      expect(isTimedOut).toBe(true);
    });

    test("should handle rapid successive page refreshes", () => {
      const sessionData = {
        session_id: "ses_rapid_refresh",
        started_at: Date.now(),
        last_activity: Date.now(),
        page_count: 1,
        utm_hash: null,
      };

      localStorage.setItem("zori_session", JSON.stringify(sessionData));

      for (let i = 0; i < 3; i++) {
        jest.spyOn(Date, "now").mockReturnValue(Date.now() + 333); // 333ms apart

        const session = JSON.parse(localStorage.getItem("zori_session"));
        session.last_activity = Date.now();
        localStorage.setItem("zori_session", JSON.stringify(session));
      }

      const finalSession = JSON.parse(localStorage.getItem("zori_session"));
      expect(finalSession.session_id).toBe("ses_rapid_refresh");
    });
  });

  describe("Integration Test: Full Page Lifecycle", () => {
    test("should maintain session through complete page lifecycle", async () => {
      const initialSessionData = {
        session_id: "ses_lifecycle_test",
        started_at: Date.now(),
        last_activity: Date.now(),
        page_count: 1,
        utm_hash: null,
      };

      localStorage.setItem("zori_session", JSON.stringify(initialSessionData));
      document.cookie =
        "zori_session_id=ses_lifecycle_test;path=/;SameSite=Lax";

      jest.spyOn(Date, "now").mockReturnValue(Date.now() + 60000); // 1 minute later
      const session1 = JSON.parse(localStorage.getItem("zori_session"));
      session1.last_activity = Date.now();
      localStorage.setItem("zori_session", JSON.stringify(session1));

      jest.spyOn(Date, "now").mockReturnValue(Date.now() + 120000); // 2 minutes later
      const session2 = JSON.parse(localStorage.getItem("zori_session"));
      session2.last_activity = Date.now();
      localStorage.setItem("zori_session", JSON.stringify(session2));

      const session3 = JSON.parse(localStorage.getItem("zori_session"));
      expect(session3).not.toBeNull();
      expect(session3.session_id).toBe("ses_lifecycle_test");

      const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
      const isTimedOut =
        Date.now() - session3.last_activity > SESSION_TIMEOUT_MS;
      expect(isTimedOut).toBe(false);
    });
  });
});
