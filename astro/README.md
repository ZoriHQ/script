# @zorihq/astro

ZoriHQ Analytics SDK for Astro applications.

## Installation

```bash
npm install @zorihq/astro
# or
pnpm add @zorihq/astro
# or
yarn add @zorihq/astro
```

## Quick Start

### 1. Add the ZoriScript component

Add the `ZoriScript` component to your layout or base template:

```astro
---
// src/layouts/Layout.astro
import { ZoriScript } from '@zorihq/astro/ZoriScript.astro';
---

<html>
  <head>
    <ZoriScript publishableKey="your-publishable-key" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

### 2. Track custom events

Use the client-side utilities in your scripts:

```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
---

<Layout>
  <button id="signup-btn">Sign Up</button>
</Layout>

<script>
  import { track } from '@zorihq/astro';

  document.getElementById('signup-btn')?.addEventListener('click', () => {
    track('signup_clicked', { location: 'homepage' });
  });
</script>
```

## Configuration

The `ZoriScript` component accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `publishableKey` | `string` | **required** | Your ZoriHQ publishable key |
| `baseUrl` | `string` | `undefined` | Custom API base URL |
| `comebackThreshold` | `number` | `undefined` | Threshold in ms for detecting user comebacks |
| `trackQuickSwitches` | `boolean` | `undefined` | Whether to track quick tab switches |
| `autoTrackPageViews` | `boolean` | `true` | Whether to auto-track page views |

### Example with all options

```astro
<ZoriScript
  publishableKey="your-publishable-key"
  baseUrl="https://custom-api.example.com"
  comebackThreshold={30000}
  trackQuickSwitches={true}
  autoTrackPageViews={true}
/>
```

## View Transitions Support

The SDK automatically supports Astro's View Transitions. Page views are tracked on:
- Initial page load
- Navigation via View Transitions (`astro:page-load` event)

No additional configuration is needed.

## Client-Side API

### track(eventName, properties?)

Track a custom event:

```typescript
import { track } from '@zorihq/astro';

await track('button_click', { button_id: 'cta-primary' });
```

### identify(userInfo)

Identify a user:

```typescript
import { identify } from '@zorihq/astro';

await identify({
  app_id: 'user-123',
  email: 'user@example.com',
  full_name: 'John Doe',
  plan: 'premium'
});
```

### trackPageView(properties?)

Manually track a page view (useful when auto-tracking is disabled):

```typescript
import { trackPageView } from '@zorihq/astro';

await trackPageView({ custom_property: 'value' });
```

### getVisitorId()

Get the current visitor ID:

```typescript
import { getVisitorId } from '@zorihq/astro';

const visitorId = await getVisitorId();
```

### getSessionId()

Get the current session ID:

```typescript
import { getSessionId } from '@zorihq/astro';

const sessionId = getSessionId();
```

### setConsent(preferences)

Set user consent preferences:

```typescript
import { setConsent } from '@zorihq/astro';

setConsent({
  analytics: true,
  marketing: false
});
```

### optOut()

Opt the user out of all tracking:

```typescript
import { optOut } from '@zorihq/astro';

optOut();
```

### hasConsent()

Check if the user has given consent:

```typescript
import { hasConsent } from '@zorihq/astro';

if (hasConsent()) {
  // User has given consent
}
```

### isInitialized()

Check if ZoriHQ is initialized:

```typescript
import { isInitialized } from '@zorihq/astro';

if (isInitialized()) {
  // Script is fully loaded
}
```

### waitForInit(timeout?)

Wait for ZoriHQ to be initialized:

```typescript
import { waitForInit, track } from '@zorihq/astro';

await waitForInit(5000); // Wait up to 5 seconds
await track('initialized');
```

### createClickHandler(eventName?, properties?)

Create a reusable click handler:

```typescript
import { createClickHandler } from '@zorihq/astro';

const handler = createClickHandler('cta_click', { location: 'header' });
document.getElementById('cta')?.addEventListener('click', handler);
```

## Using with Framework Components

If you're using React, Vue, or Svelte components in your Astro project, you can use the client-side utilities within those components:

### React Component Example

```tsx
// src/components/SignupButton.tsx
import { track } from '@zorihq/astro';

export default function SignupButton() {
  const handleClick = () => {
    track('signup_clicked', { component: 'react' });
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
```

### Vue Component Example

```vue
<!-- src/components/SignupButton.vue -->
<script setup>
import { track } from '@zorihq/astro';

const handleClick = () => {
  track('signup_clicked', { component: 'vue' });
};
</script>

<template>
  <button @click="handleClick">Sign Up</button>
</template>
```

## TypeScript Support

This package includes TypeScript definitions. All types are exported:

```typescript
import type { ZoriConfig, ConsentPreferences, UserInfo } from '@zorihq/astro';

const config: ZoriConfig = {
  publishableKey: 'your-key',
  baseUrl: 'https://api.example.com'
};

const user: UserInfo = {
  app_id: '123',
  email: 'user@example.com'
};
```

## SSR Considerations

The client-side utilities (`track`, `identify`, etc.) are designed to run in the browser. When using them in SSR contexts, they will safely return without effect.

For server-side tracking needs, consider using the tracking API directly from your server endpoints.

## License

MIT
