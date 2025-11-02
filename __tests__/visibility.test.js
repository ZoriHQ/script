/**
 * Smart Visibility Tracking Tests
 *
 * These tests verify that the smart visibility tracking works correctly:
 * 1. Ignores quick tab switches (< 30 seconds by default)
 * 2. Tracks user comeback events when hidden for significant time
 * 3. Detects when user leaves while page is hidden
 */

const { describe, test, expect, beforeEach } = require("@jest/globals");

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
);

describe("Smart Visibility Tracking", () => {
  let scriptTag;
  let dateNowSpy;

  beforeEach(async () => {
    document.body.innerHTML = "";

    localStorage.clear();
    document.cookie = "";

    global.fetch.mockClear();

    dateNowSpy = jest.spyOn(Date, "now");
    dateNowSpy.mockReturnValue(1000000000000);

    scriptTag = document.createElement("script");
    scriptTag.setAttribute("data-key", "test-key-123");
    scriptTag.setAttribute("data-base-url", "https://test.example.com/ingest");
    document.body.appendChild(scriptTag);

    Object.defineProperty(document, "currentScript", {
      value: scriptTag,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });

    const fs = require("fs");
    const path = require("path");
    const scriptPath = path.join(__dirname, "..", "script.js");
    const scriptContent = fs.readFileSync(scriptPath, "utf8");

    eval(scriptContent);

    await new Promise((resolve) => setTimeout(resolve, 50));

    global.fetch.mockClear();
  });

  describe("Default Behavior (Smart Tracking)", () => {
    test("should ignore quick tab switches under 30 seconds", async () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event("visibilitychange");
      document.dispatchEvent(hiddenEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const hiddenCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "page_hidden";
      });
      expect(hiddenCalls.length).toBe(0);

      dateNowSpy.mockReturnValue(startTime + 10000);

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event("visibilitychange");
      document.dispatchEvent(visibleEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const comebackCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "user_comeback";
      });
      expect(comebackCalls.length).toBe(0);
    });

    test("should track user_comeback when hidden for more than 30 seconds", async () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event("visibilitychange");
      document.dispatchEvent(hiddenEvent);

      dateNowSpy.mockReturnValue(startTime + 35000);

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event("visibilitychange");
      document.dispatchEvent(visibleEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const comebackCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "user_comeback";
      });

      expect(comebackCalls.length).toBe(1);

      const comebackEventBody = JSON.parse(comebackCalls[0][1].body);
      expect(comebackEventBody.custom_properties.hidden_duration_ms).toBe(
        35000,
      );
      expect(comebackEventBody.custom_properties.hidden_duration_seconds).toBe(
        35,
      );
    });

    test("should track left_while_hidden when page unloads while hidden", async () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event("visibilitychange");
      document.dispatchEvent(hiddenEvent);

      dateNowSpy.mockReturnValue(startTime + 15000);

      const unloadEvent = new Event("beforeunload");
      window.dispatchEvent(unloadEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const leftHiddenCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "left_while_hidden";
      });

      expect(leftHiddenCalls.length).toBe(1);

      const leftHiddenEventBody = JSON.parse(leftHiddenCalls[0][1].body);
      expect(leftHiddenEventBody.custom_properties.hidden_duration_ms).toBe(
        15000,
      );
      expect(
        leftHiddenEventBody.custom_properties.hidden_duration_seconds,
      ).toBe(15);
    });

    test("should NOT track left_while_hidden when page unloads while visible", async () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      // Keep page visible
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });

      const unloadEvent = new Event("beforeunload");
      window.dispatchEvent(unloadEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const leftHiddenCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "left_while_hidden";
      });

      expect(leftHiddenCalls.length).toBe(0);
    });
  });

  describe("Custom Comeback Threshold", () => {
    test("should respect custom comeback threshold", async () => {
      scriptTag.setAttribute("data-comeback-threshold", "60000");

      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event("visibilitychange");
      document.dispatchEvent(hiddenEvent);

      dateNowSpy.mockReturnValue(startTime + 45000);

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event("visibilitychange");
      document.dispatchEvent(visibleEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const comebackCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "user_comeback";
      });
      expect(comebackCalls.length).toBe(0);

      dateNowSpy.mockReturnValue(startTime);
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange")); // hidden

      dateNowSpy.mockReturnValue(startTime + 65000);
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange")); // visible

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Now it should track
      const comebackCalls2 = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "user_comeback";
      });
      expect(comebackCalls2.length).toBeGreaterThan(0);
    });
  });

  describe("Track Quick Switches Mode", () => {
    test("should track all visibility changes when data-track-quick-switches is true", async () => {
      scriptTag.setAttribute("data-track-quick-switches", "true");

      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event("visibilitychange");
      document.dispatchEvent(hiddenEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const hiddenCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "page_hidden";
      });
      expect(hiddenCalls.length).toBe(1);

      dateNowSpy.mockReturnValue(startTime + 5000);

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event("visibilitychange");
      document.dispatchEvent(visibleEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const visibleCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "page_visible";
      });
      expect(visibleCalls.length).toBe(1);

      const visibleEventBody = JSON.parse(visibleCalls[0][1].body);
      expect(visibleEventBody.custom_properties.hidden_duration_ms).toBe(5000);
    });
  });

  describe("Multiple Visibility Cycles", () => {
    test("should handle multiple hide/show cycles correctly", async () => {
      const startTime = 1000000000000;
      let currentTime = startTime;

      dateNowSpy.mockReturnValue(currentTime);
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      currentTime += 10000;
      dateNowSpy.mockReturnValue(currentTime);
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      currentTime += 40000;
      dateNowSpy.mockReturnValue(currentTime);
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      await new Promise((resolve) => setTimeout(resolve, 10));

      const comebackCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "user_comeback";
      });
      expect(comebackCalls.length).toBe(1);

      const comebackEventBody = JSON.parse(comebackCalls[0][1].body);
      expect(comebackEventBody.custom_properties.hidden_duration_ms).toBe(
        40000,
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle page becoming visible without prior hidden event", async () => {
      // Simulate page becoming visible without prior hidden
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event("visibilitychange");
      document.dispatchEvent(visibleEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const visibleCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return (
          body.event_name === "page_visible" ||
          body.event_name === "user_comeback"
        );
      });
      expect(visibleCalls.length).toBe(0);
    });

    test("should reset pageHiddenAt after tracking comeback", async () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      dateNowSpy.mockReturnValue(startTime + 35000);
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      dateNowSpy.mockReturnValue(startTime + 45000);
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      await new Promise((resolve) => setTimeout(resolve, 10));

      const comebackCalls = global.fetch.mock.calls.filter((call) => {
        const body = JSON.parse(call[1].body);
        return body.event_name === "user_comeback";
      });
      expect(comebackCalls.length).toBe(1);
      expect(
        JSON.parse(comebackCalls[0][1].body).custom_properties
          .hidden_duration_ms,
      ).toBe(35000);
    });
  });
});
