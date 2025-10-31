/**
 * Smart Visibility Tracking Tests
 *
 * These tests verify that the smart visibility tracking works correctly:
 * 1. Ignores quick tab switches (< 30 seconds by default)
 * 2. Tracks user comeback events when hidden for significant time
 * 3. Detects when user leaves while page is hidden
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

describe('Smart Visibility Tracking', () => {
  let scriptTag;
  let dateNowSpy;

  beforeEach(async () => {
    // Clear any existing script tags
    document.body.innerHTML = '';

    // Reset localStorage and cookies
    localStorage.clear();
    document.cookie = '';

    // Clear fetch mock
    global.fetch.mockClear();

    // Mock Date.now for consistent testing
    dateNowSpy = jest.spyOn(Date, 'now');
    dateNowSpy.mockReturnValue(1000000000000);

    // Set up a mock script tag with required attributes
    scriptTag = document.createElement('script');
    scriptTag.setAttribute('data-key', 'test-key-123');
    scriptTag.setAttribute('data-base-url', 'https://test.example.com/ingest');
    document.body.appendChild(scriptTag);

    // Mock currentScript
    Object.defineProperty(document, 'currentScript', {
      value: scriptTag,
      writable: true,
      configurable: true,
    });

    // Mock visibilityState
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });

    // Load and execute the script
    const fs = require('fs');
    const path = require('path');
    const scriptPath = path.join(__dirname, '..', 'script.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    // Execute script in test environment
    eval(scriptContent);

    // Wait for init to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Clear fetch calls from initialization
    global.fetch.mockClear();
  });

  describe('Default Behavior (Smart Tracking)', () => {
    test('should ignore quick tab switches under 30 seconds', async () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      // Simulate page becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event('visibilitychange');
      document.dispatchEvent(hiddenEvent);

      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify no page_hidden event was tracked (quick switches not tracked by default)
      const hiddenCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'page_hidden';
      });
      expect(hiddenCalls.length).toBe(0);

      // Wait 10 seconds (less than 30 second threshold)
      dateNowSpy.mockReturnValue(startTime + 10000);

      // Simulate page becoming visible again
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event('visibilitychange');
      document.dispatchEvent(visibleEvent);

      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify no user_comeback event was tracked (under threshold)
      const comebackCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'user_comeback';
      });
      expect(comebackCalls.length).toBe(0);
    });

    test('should track user_comeback when hidden for more than 30 seconds', async () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      // Simulate page becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event('visibilitychange');
      document.dispatchEvent(hiddenEvent);

      // Wait 35 seconds (more than 30 second threshold)
      dateNowSpy.mockReturnValue(startTime + 35000);

      // Simulate page becoming visible again
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event('visibilitychange');
      document.dispatchEvent(visibleEvent);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify user_comeback event was tracked
      const comebackCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'user_comeback';
      });

      expect(comebackCalls.length).toBe(1);

      // Verify the event includes duration
      const comebackEventBody = JSON.parse(comebackCalls[0][1].body);
      expect(comebackEventBody.custom_properties.hidden_duration_ms).toBe(35000);
      expect(comebackEventBody.custom_properties.hidden_duration_seconds).toBe(35);
    });

    test('should track left_while_hidden when page unloads while hidden', () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      // Simulate page becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event('visibilitychange');
      document.dispatchEvent(hiddenEvent);

      // Wait 15 seconds
      dateNowSpy.mockReturnValue(startTime + 15000);

      // Simulate page unload while still hidden
      const unloadEvent = new Event('beforeunload');
      window.dispatchEvent(unloadEvent);

      // Verify left_while_hidden event was tracked
      const leftHiddenCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'left_while_hidden';
      });

      expect(leftHiddenCalls.length).toBe(1);

      // Verify the event includes duration
      const leftHiddenEventBody = JSON.parse(leftHiddenCalls[0][1].body);
      expect(leftHiddenEventBody.custom_properties.hidden_duration_ms).toBe(15000);
      expect(leftHiddenEventBody.custom_properties.hidden_duration_seconds).toBe(15);
    });

    test('should NOT track left_while_hidden when page unloads while visible', () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      // Keep page visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      // Simulate page unload while visible
      const unloadEvent = new Event('beforeunload');
      window.dispatchEvent(unloadEvent);

      // Verify NO left_while_hidden event was tracked
      const leftHiddenCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'left_while_hidden';
      });

      expect(leftHiddenCalls.length).toBe(0);
    });
  });

  describe('Custom Comeback Threshold', () => {
    test('should respect custom comeback threshold', () => {
      // Set custom threshold to 60 seconds (60000ms)
      scriptTag.setAttribute('data-comeback-threshold', '60000');

      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      // Simulate page becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event('visibilitychange');
      document.dispatchEvent(hiddenEvent);

      // Wait 45 seconds (less than 60 second custom threshold)
      dateNowSpy.mockReturnValue(startTime + 45000);

      // Simulate page becoming visible again
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event('visibilitychange');
      document.dispatchEvent(visibleEvent);

      // Verify NO user_comeback event (under custom threshold)
      const comebackCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'user_comeback';
      });
      expect(comebackCalls.length).toBe(0);

      // Now wait 65 seconds total (more than custom threshold)
      dateNowSpy.mockReturnValue(startTime + 65000);

      // Hide and show again
      document.dispatchEvent(new Event('visibilitychange')); // hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange')); // visible

      // Now it should track
      const comebackCalls2 = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'user_comeback';
      });
      expect(comebackCalls2.length).toBeGreaterThan(0);
    });
  });

  describe('Track Quick Switches Mode', () => {
    test('should track all visibility changes when data-track-quick-switches is true', () => {
      // Enable quick switch tracking
      scriptTag.setAttribute('data-track-quick-switches', 'true');

      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      // Simulate page becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      const hiddenEvent = new Event('visibilitychange');
      document.dispatchEvent(hiddenEvent);

      // Verify page_hidden event WAS tracked
      const hiddenCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'page_hidden';
      });
      expect(hiddenCalls.length).toBe(1);

      // Wait 5 seconds (quick switch)
      dateNowSpy.mockReturnValue(startTime + 5000);

      // Simulate page becoming visible again
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event('visibilitychange');
      document.dispatchEvent(visibleEvent);

      // Verify page_visible event WAS tracked (with duration)
      const visibleCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'page_visible';
      });
      expect(visibleCalls.length).toBe(1);

      // Verify the event includes duration
      const visibleEventBody = JSON.parse(visibleCalls[0][1].body);
      expect(visibleEventBody.custom_properties.hidden_duration_ms).toBe(5000);
    });
  });

  describe('Multiple Visibility Cycles', () => {
    test('should handle multiple hide/show cycles correctly', () => {
      const startTime = 1000000000000;
      let currentTime = startTime;

      // Cycle 1: Quick switch (10 seconds) - should be ignored
      dateNowSpy.mockReturnValue(currentTime);
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      currentTime += 10000;
      dateNowSpy.mockReturnValue(currentTime);
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Cycle 2: Long absence (40 seconds) - should track comeback
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      currentTime += 40000;
      dateNowSpy.mockReturnValue(currentTime);
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Verify only ONE user_comeback event (for the long absence)
      const comebackCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'user_comeback';
      });
      expect(comebackCalls.length).toBe(1);

      const comebackEventBody = JSON.parse(comebackCalls[0][1].body);
      expect(comebackEventBody.custom_properties.hidden_duration_ms).toBe(40000);
    });
  });

  describe('Edge Cases', () => {
    test('should handle page becoming visible without prior hidden event', () => {
      // Simulate page becoming visible without prior hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      const visibleEvent = new Event('visibilitychange');
      document.dispatchEvent(visibleEvent);

      // Should not crash or track event (since pageHiddenAt is null)
      const visibleCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'page_visible' || body.event_name === 'user_comeback';
      });
      expect(visibleCalls.length).toBe(0);
    });

    test('should reset pageHiddenAt after tracking comeback', () => {
      const startTime = 1000000000000;
      dateNowSpy.mockReturnValue(startTime);

      // First cycle: hidden for 35 seconds
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      dateNowSpy.mockReturnValue(startTime + 35000);
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Second cycle: hidden for only 10 seconds (should be ignored)
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      dateNowSpy.mockReturnValue(startTime + 45000);
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Should only have ONE comeback event (from first cycle)
      const comebackCalls = global.fetch.mock.calls.filter(call => {
        const body = JSON.parse(call[1].body);
        return body.event_name === 'user_comeback';
      });
      expect(comebackCalls.length).toBe(1);
      expect(JSON.parse(comebackCalls[0][1].body).custom_properties.hidden_duration_ms).toBe(35000);
    });
  });
});
