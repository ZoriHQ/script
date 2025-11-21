# @zorihq/svelte

Svelte stores, actions, and components for ZoriHQ Analytics.

## Installation

```bash
npm install @zorihq/svelte
# or
pnpm add @zorihq/svelte
# or
yarn add @zorihq/svelte
```

## Usage

### 1. Initialize Zori

#### Option A: Global Store (Recommended)

Initialize once in your root component or layout:

```svelte
<!-- +layout.svelte or App.svelte -->
<script lang="ts">
  import { initZori } from '@zorihq/svelte';

  const zori = initZori({
    publishableKey: 'your-publishable-key',
    baseUrl: 'https://ingestion.zorihq.com/ingest', // optional
    comebackThreshold: 30000, // optional
    trackQuickSwitches: false, // optional
  });
</script>

<slot />
```

#### Option B: Component Context

Use the `ZoriProvider` component:

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { ZoriProvider } from '@zorihq/svelte';
</script>

<ZoriProvider config={{ publishableKey: 'your-key' }}>
  <slot />
</ZoriProvider>
```

### 2. Track Events

```svelte
<script lang="ts">
  import { getZori } from '@zorihq/svelte';

  const zori = getZori();

  async function handlePurchase() {
    await zori.track('purchase_completed', {
      product_id: 'prod_123',
      amount: 99.99,
    });
  }

  async function handleLogin() {
    await zori.identify({
      app_id: 'user_123',
      email: 'user@example.com',
      fullname: 'John Doe',
    });
  }
</script>

<button on:click={handlePurchase}>Complete Purchase</button>
<button on:click={handleLogin}>Login</button>
```

### 3. Use Actions

#### trackClick Action

Automatically track clicks on any element:

```svelte
<script lang="ts">
  import { trackClick } from '@zorihq/svelte';
</script>

<button
  use:trackClick={{ eventName: 'signup_clicked', properties: { location: 'header' } }}
>
  Sign Up
</button>

<a
  href="/pricing"
  use:trackClick={{ eventName: 'cta_clicked', properties: { cta: 'pricing' } }}
>
  View Pricing
</a>
```

### 4. Use Helpers

#### usePageView

Auto-track page views on component mount:

```svelte
<script lang="ts">
  import { usePageView } from '@zorihq/svelte';

  export let productId: string;

  usePageView({
    page_type: 'product',
    product_id: productId,
  });
</script>

<div>Product {productId}</div>
```

#### useTrackEvent

Track events on component mount:

```svelte
<script lang="ts">
  import { useTrackEvent } from '@zorihq/svelte';

  export let userId: string;

  useTrackEvent('profile_viewed', {
    user_id: userId,
  });
</script>

<div>User Profile</div>
```

#### useIdentify

Identify users on component mount:

```svelte
<script lang="ts">
  import { useIdentify } from '@zorihq/svelte';

  export let user: any;

  useIdentify(
    user
      ? {
          app_id: user.id,
          email: user.email,
          fullname: user.name,
        }
      : null
  );
</script>

<div>{user?.name}</div>
```

### 5. Reactive Tracking

```svelte
<script lang="ts">
  import { getZori } from '@zorihq/svelte';

  const zori = getZori();

  let searchQuery = '';
  let results = [];

  // Track when reactive values change
  $: if ($zori.isInitialized && searchQuery) {
    zori.track('search_performed', {
      query: searchQuery,
      result_count: results.length,
    });
  }
</script>

<input bind:value={searchQuery} placeholder="Search..." />
<div>{results.length} results</div>
```

### 6. Check Initialization Status

```svelte
<script lang="ts">
  import { getZori } from '@zorihq/svelte';

  const zori = getZori();
</script>

{#if $zori.isInitialized}
  <p>Analytics Ready!</p>
{:else}
  <p>Loading analytics...</p>
{/if}
```

## SvelteKit Integration

### +layout.svelte

```svelte
<script lang="ts">
  import { initZori } from '@zorihq/svelte';
  import { page } from '$app/stores';

  const zori = initZori({
    publishableKey: import.meta.env.VITE_ZORI_KEY,
  });

  // Track page views on route change
  $: if ($zori.isInitialized && $page.url.pathname) {
    zori.track('page_view', {
      page_title: document.title,
      page_path: $page.url.pathname,
      page_search: $page.url.search,
    });
  }
</script>

<slot />
```

### Environment Variables

Create `.env`:

```env
VITE_ZORI_KEY=your-publishable-key
```

## API Reference

### createZoriStore(config)

Create a new Zori store instance.

```typescript
import { createZoriStore } from '@zorihq/svelte';

const zori = createZoriStore({
  publishableKey: 'your-key',
  baseUrl: 'https://ingestion.zorihq.com/ingest', // optional
  comebackThreshold: 30000, // optional
  trackQuickSwitches: false, // optional
});
```

### initZori(config)

Initialize global Zori store (recommended for app-wide usage).

```typescript
import { initZori } from '@zorihq/svelte';

const zori = initZori({ publishableKey: 'your-key' });
```

### getZori()

Get the global Zori store instance.

```typescript
import { getZori } from '@zorihq/svelte';

const zori = getZori();
```

### ZoriStore

The store exposes:

- `isInitialized`: Readable store indicating if ZoriHQ is ready
- `track(eventName, properties)`: Track custom events
- `identify(userInfo)`: Identify users
- `getVisitorId()`: Get the visitor ID
- `getSessionId()`: Get the current session ID
- `setConsent(preferences)`: Set GDPR consent preferences
- `optOut()`: Opt out of tracking completely
- `hasConsent()`: Check if user has given consent

### Actions

#### trackClick

```svelte
<button use:trackClick={{ eventName: 'click', properties: {} }}>
  Click Me
</button>
```

### Helpers

- `usePageView(properties?)`: Track page view on mount
- `useTrackEvent(eventName, properties?)`: Track event on mount
- `useIdentify(userInfo)`: Identify user on mount

## TypeScript Support

This package includes full TypeScript support:

```typescript
import type {
  ZoriConfig,
  ZoriStore,
  ConsentPreferences,
  UserInfo,
} from '@zorihq/svelte';
```

## Stores Pattern

This library follows Svelte's stores pattern:

- Use `$` to auto-subscribe in components
- Stores are reactive and update automatically
- Automatic cleanup on component destroy

## License

MIT
