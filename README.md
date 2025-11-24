# ZoriHQ Analytics

A lightweight, privacy-focused analytics library with scroll heatmaps, session recording, and multi-framework support.

## Features

- **Automatic Event Tracking** - Page views, clicks, visibility changes, sessions
- **Scroll Depth Tracking** - Normalized scroll positions for heatmap generation
- **Session Recording** - Optional RRWeb integration for session replays
- **Click Heatmaps** - Click positions normalized by screen size
- **Browser Fingerprinting** - Canvas, WebGL, Audio Context fingerprinting
- **Persistent Visitor ID** - Cookie-based identification with 2-year expiry
- **UTM Parameter Tracking** - Automatic campaign attribution
- **Session Management** - 30-minute timeout with automatic restart
- **GDPR Compliant** - Consent management, DNT support, opt-out
- **Framework SDKs** - React, Next.js, Vue, Svelte integrations
- **Event Queue** - Track events before script loads

## Quick Start

```html
<script>
  window.ZoriHQ = window.ZoriHQ || [];
</script>
<script async src="https://cdn.zorihq.com/script.min.js" data-key="your-publishable-key"></script>
```

## Framework SDKs

### React

```bash
npm install @zorihq/react
```

```tsx
import { ZoriProvider, useZori, useScrollData, useSessionRecording } from '@zorihq/react';

function App() {
  return (
    <ZoriProvider config={{ publishableKey: 'your-key' }}>
      <YourApp />
    </ZoriProvider>
  );
}

function Dashboard() {
  const { track, identify } = useZori();
  const scrollData = useScrollData();
  const { isRecording, start, stop } = useSessionRecording();

  return (
    <div>
      <p>Max scroll: {scrollData?.max_depth_percent}%</p>
      <button onClick={() => start()}>Start Recording</button>
    </div>
  );
}
```

### Next.js (App Router)

```bash
npm install @zorihq/nextjs
```

```tsx
'use client';
import { ZoriProvider, useZori, useScrollData, useSessionRecording } from '@zorihq/nextjs';

// Automatically tracks page views on route changes
export default function RootLayout({ children }) {
  return (
    <ZoriProvider config={{ publishableKey: 'your-key' }}>
      {children}
    </ZoriProvider>
  );
}
```

### Vue 3

```bash
npm install @zorihq/vue
```

```ts
import { createApp } from 'vue';
import { ZoriPlugin } from '@zorihq/vue';

const app = createApp(App);
app.use(ZoriPlugin, {
  config: { publishableKey: 'your-key' },
  router: router, // Optional: auto-track page views
});
```

```vue
<script setup>
import { useZori, useScrollData, useSessionRecording } from '@zorihq/vue';

const { track } = useZori();
const scrollData = useScrollData();
const { status, start, stop } = useSessionRecording();
</script>
```

### Svelte

```bash
npm install @zorihq/svelte
```

```svelte
<script>
  import { initZori, useScrollData, useSessionRecording } from '@zorihq/svelte';

  initZori({ publishableKey: 'your-key' });

  const scrollData = useScrollData();
  const { status, start, stop } = useSessionRecording();
</script>
```

---

## Configuration

### Script Tag Attributes

```html
<script
  src="https://cdn.zorihq.com/script.min.js"
  data-key="your-publishable-key"
  data-base-url="https://custom-endpoint.com/ingest"
  data-comeback-threshold="30000"
  data-track-quick-switches="false"
  data-track-scroll-depth="true"
  data-scroll-throttle-ms="250"
  data-scroll-depth-intervals="[25, 50, 75, 90, 100]"
  data-enable-session-recording="false"
  data-rrweb-cdn-url="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js">
</script>
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-key` | *required* | Your ZoriHQ publishable key |
| `data-base-url` | `https://ingestion.zorihq.com/ingest` | Custom ingestion endpoint |
| `data-comeback-threshold` | `30000` | Min hidden duration (ms) to trigger `user_comeback` |
| `data-track-quick-switches` | `false` | Track all visibility changes |
| `data-track-scroll-depth` | `true` | Enable scroll depth tracking |
| `data-scroll-throttle-ms` | `250` | Throttle interval for scroll events |
| `data-scroll-depth-intervals` | `[25, 50, 75, 90, 100]` | Milestone percentages to track |
| `data-enable-session-recording` | `false` | Auto-start session recording on load |
| `data-rrweb-cdn-url` | jsDelivr CDN | Custom RRWeb script URL |

---

## JavaScript API

### Track Events

```javascript
// Track custom event
window.ZoriHQ.track('button_clicked', { button_name: 'Sign Up' });

// Queue method (works before script loads)
window.ZoriHQ.push(['track', 'purchase', { amount: 99.99 }]);
```

### Identify Users

```javascript
window.ZoriHQ.identify({
  app_id: 'user_123',
  email: 'user@example.com',
  fullname: 'John Doe',
  plan: 'premium'
});
```

### Get IDs

```javascript
const visitorId = await window.ZoriHQ.getVisitorId();
const sessionId = window.ZoriHQ.getSessionId();
```

### Consent Management

```javascript
// Set consent
window.ZoriHQ.setConsent({ analytics: true, marketing: false });

// Check consent
const hasConsent = window.ZoriHQ.hasConsent();

// Opt out completely (deletes all data)
window.ZoriHQ.optOut();
```

---

## Scroll Depth Tracking

Scroll tracking is enabled by default and provides normalized scroll data for building heatmaps.

### Events Tracked

| Event | Trigger | Data |
|-------|---------|------|
| `scroll_depth_milestone` | When user scrolls past 25%, 50%, 75%, 90%, 100% | Milestone %, scroll metrics |
| `scroll_depth_final` | On page unload | Max depth, all milestones reached |

### Scroll Metrics

Each scroll event includes normalized metrics for heatmap reconstruction:

```javascript
{
  scroll_depth_percent: 75,        // Current depth (0-100)
  document_height: 3000,           // Total document height (px)
  viewport_height: 800,            // Viewport height (px)
  scroll_top: 1650,                // Scroll position from top (px)
  visible_top_percent: 55,         // Top of viewport as % of document
  visible_bottom_percent: 81.67,   // Bottom of viewport as % of document
  screen_width: 1920,              // Screen width (px)
  screen_height: 1080              // Screen height (px)
}
```

### API

```javascript
// Get current scroll heatmap data
const data = window.ZoriHQ.getScrollData();

// Returns:
{
  max_depth_percent: 75,
  milestones_reached: [25, 50, 75],
  snapshots: [...],  // Array of scroll snapshots
  current_metrics: { ... }
}
```

---

## Session Recording

Session recording uses [RRWeb](https://www.rrweb.io/) to capture DOM mutations for session replay.

### Enable Recording

**Option 1: Auto-start via config**
```html
<script src="..." data-enable-session-recording="true"></script>
```

**Option 2: Start programmatically**
```javascript
await window.ZoriHQ.startRecording();
window.ZoriHQ.stopRecording();
```

**Option 3: With custom options**
```javascript
await window.ZoriHQ.startRecording({
  maskAllInputs: true,
  blockClass: 'zori-block',
  ignoreClass: 'zori-ignore',
  maskTextClass: 'zori-mask'
});
```

### Recording Status

```javascript
const status = window.ZoriHQ.getRecordingStatus();
// { isRecording: true, eventCount: 42, rrwebLoaded: true }
```

### Privacy CSS Classes

Use these CSS classes to control what gets recorded:

| Class | Effect | Use Case |
|-------|--------|----------|
| `zori-block` | Element is replaced with placeholder | Sensitive sections, iframes, videos |
| `zori-ignore` | Input values not captured | Password fields, credit cards |
| `zori-mask` | Text content is masked with `*` | Personal info, emails in UI |

**Example:**
```html
<!-- This entire section won't be recorded -->
<div class="zori-block">
  <iframe src="payment-form.html"></iframe>
</div>

<!-- Input value won't be captured -->
<input type="text" class="zori-ignore" placeholder="SSN">

<!-- Text will appear as "****" in replay -->
<p class="zori-mask">user@email.com</p>
```

### Default Privacy Settings

Session recording has privacy-focused defaults:
- All input values are masked by default
- Password and email inputs are always masked
- Recording respects consent settings and DNT headers

---

## Automatic Events

### Events Tracked

| Event | Trigger | Data Included |
|-------|---------|---------------|
| `page_view` | Page load | Title, path, search, hash |
| `click` | Any click | Element info, position, screen size |
| `session_start` | New session | UTM params, referrer |
| `session_end` | Session timeout/close | Duration, page count |
| `user_comeback` | Return after >30s hidden | Hidden duration |
| `left_while_hidden` | Close while tab hidden | Hidden duration |
| `scroll_depth_milestone` | Scroll milestone reached | Scroll metrics |
| `scroll_depth_final` | Page unload | Max depth, milestones |
| `session_recording_started` | Recording begins | Recording options |
| `session_recording_stopped` | Recording ends | - |

### Click Event Data

```javascript
{
  click_element: {
    tag: 'button',
    type: 'button',
    text: 'Sign Up',
    selector: '#signup-btn',
    data_attributes: { 'data-action': 'signup' }
  },
  click_position: {
    x: 450,
    y: 320,
    screen_width: 1920,
    screen_height: 1080
  }
}
```

### Session Management

Sessions automatically restart when:
- 30 minutes of inactivity
- New UTM parameters detected
- Browser session ends

---

## Browser Fingerprinting

On first visit, generates a comprehensive fingerprint:

- Screen: resolution, color depth, orientation
- Browser: user agent, platform, languages, timezone
- Hardware: CPU cores, memory, touch points
- Canvas & WebGL fingerprints
- Audio context fingerprint
- Media devices count
- Network connection info
- Battery status

Fingerprint is stored in localStorage to identify returning visitors.

---

## GDPR Compliance

### Do Not Track (DNT)

Automatically respects browser DNT header. No tracking occurs if enabled.

### Cookies Used

| Cookie | Purpose | Expiry |
|--------|---------|--------|
| `zori_visitor_id` | Anonymous visitor tracking | 2 years |
| `zori_session_id` | Session tracking | Browser close |
| `zori_consent` | Consent preferences | 2 years |

### Right to be Forgotten

```javascript
window.ZoriHQ.optOut();
// Deletes all cookies, localStorage data, blocks future tracking
```

---

## CDN URLs

| URL | Description |
|-----|-------------|
| `https://cdn.zorihq.com/script.min.js` | Latest stable |
| `https://cdn.zorihq.com/latest/script.min.js` | Latest stable |
| `https://cdn.zorihq.com/v1.3.0/script.min.js` | Specific version |

---

## Development

### Prerequisites

- Node.js 23+
- pnpm 10+

### Build

```bash
pnpm install
pnpm run build  # Creates dist/script.min.js
```

### Release

Uses semantic versioning with conventional commits:

```bash
feat: new feature      # Minor release
fix: bug fix           # Patch release
feat!: breaking change # Major release
```

---

## License

MIT
