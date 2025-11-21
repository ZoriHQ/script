# @zorihq/vue

Vue 3 composables and plugin for ZoriHQ Analytics.

## Installation

```bash
npm install @zorihq/vue
# or
pnpm add @zorihq/vue
# or
yarn add @zorihq/vue
```

## Usage

### 1. Install the Plugin

```typescript
// main.ts
import { createApp } from 'vue';
import { ZoriPlugin } from '@zorihq/vue';
import App from './App.vue';
import router from './router'; // Optional: for auto-tracking

const app = createApp(App);

app.use(ZoriPlugin, {
  config: {
    publishableKey: 'your-publishable-key',
    baseUrl: 'https://ingestion.zorihq.com/ingest', // optional
    comebackThreshold: 30000, // optional
    trackQuickSwitches: false, // optional
  },
  router, // Optional: pass Vue Router for auto page view tracking
  autoTrackPageViews: true, // Optional: default true
});

app.use(router);
app.mount('#app');
```

### 2. Use the Composables

#### useZori - Main Composable

```vue
<script setup lang="ts">
import { useZori } from '@zorihq/vue';

const { track, identify, getVisitorId, setConsent } = useZori();

async function handlePurchase() {
  await track('purchase_completed', {
    product_id: 'prod_123',
    amount: 99.99,
  });
}

async function handleLogin() {
  await identify({
    app_id: 'user_123',
    email: 'user@example.com',
    fullname: 'John Doe',
  });
}
</script>

<template>
  <div>
    <button @click="handlePurchase">Complete Purchase</button>
    <button @click="handleLogin">Login</button>
  </div>
</template>
```

#### usePageView - Auto Track Page Views

```vue
<script setup lang="ts">
import { usePageView } from '@zorihq/vue';
import { ref } from 'vue';

const props = defineProps<{ productId: string }>();

// Track page view with static properties
usePageView({
  page_type: 'product',
  product_id: props.productId,
});
</script>

<template>
  <div>Product {{ productId }}</div>
</template>
```

#### useIdentify - Auto Identify Users

```vue
<script setup lang="ts">
import { useIdentify } from '@zorihq/vue';
import { computed } from 'vue';

const props = defineProps<{ user: any }>();

// Identify user reactively
const userInfo = computed(() =>
  props.user
    ? {
        app_id: props.user.id,
        email: props.user.email,
        fullname: props.user.name,
      }
    : null
);

useIdentify(userInfo);
</script>

<template>
  <div>{{ user?.name }}</div>
</template>
```

#### useTrackEvent - Track Events with Reactivity

```vue
<script setup lang="ts">
import { useTrackEvent } from '@zorihq/vue';
import { ref } from 'vue';

const query = ref('');
const results = ref([]);

// Re-track when reactive values change
useTrackEvent('search_completed', {
  query: query.value,
  result_count: results.value.length,
});
</script>

<template>
  <div>
    <input v-model="query" placeholder="Search..." />
    <div>{{ results.length }} results for "{{ query }}"</div>
  </div>
</template>
```

### 3. Template Usage with v-on

```vue
<script setup lang="ts">
import { useZori } from '@zorihq/vue';

const { track } = useZori();

function trackClick(eventName: string, properties: Record<string, any>) {
  track(eventName, properties);
}
</script>

<template>
  <button @click="trackClick('signup_clicked', { location: 'header' })">
    Sign Up
  </button>
</template>
```

## Vue Router Integration

When you pass the Vue Router instance to the plugin, it automatically tracks page views on route changes:

```typescript
app.use(ZoriPlugin, {
  config: { publishableKey: 'your-key' },
  router, // Auto-tracks page views
  autoTrackPageViews: true, // Enable/disable auto-tracking
});
```

Each route change will track:

- `page_title`: Document title
- `page_path`: Route path
- `page_name`: Route name
- `page_search`: Query parameters (JSON stringified)

## API Reference

### ZoriPlugin Options

```typescript
{
  config: {
    publishableKey: string; // required
    baseUrl?: string; // optional
    comebackThreshold?: number; // optional
    trackQuickSwitches?: boolean; // optional
  },
  router?: Router; // optional Vue Router instance
  autoTrackPageViews?: boolean; // optional, default true
}
```

### useZori()

Returns an object with:

- `isInitialized`: Readonly ref indicating if ZoriHQ is ready
- `track(eventName, properties)`: Track custom events
- `identify(userInfo)`: Identify users
- `getVisitorId()`: Get the visitor ID
- `getSessionId()`: Get the current session ID
- `setConsent(preferences)`: Set GDPR consent preferences
- `optOut()`: Opt out of tracking completely
- `hasConsent()`: Check if user has given consent

### usePageView(properties?)

Auto-track page view on component mount. Accepts static properties or reactive refs.

### useTrackEvent(eventName, properties?)

Track event on component mount. Supports reactive refs for both event name and properties.

### useIdentify(userInfo)

Identify user on component mount. Supports reactive refs.

## TypeScript Support

This package includes full TypeScript support:

```typescript
import type {
  ZoriConfig,
  ZoriInstance,
  ConsentPreferences,
  UserInfo,
} from '@zorihq/vue';
```

## Composition API

All composables follow Vue 3 Composition API conventions and support:

- Reactive refs
- Computed properties
- Automatic cleanup on unmount

## Options API Support

You can also use the plugin with Options API:

```vue
<script>
export default {
  inject: ['zori'],
  methods: {
    async trackPurchase() {
      await this.zori.track('purchase_completed', {
        product_id: 'prod_123',
      });
    },
  },
};
</script>
```

## License

MIT
