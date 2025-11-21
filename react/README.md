# @zorihq/react

React hooks and components for ZoriHQ Analytics.

## Installation

```bash
npm install @zorihq/react
# or
pnpm add @zorihq/react
# or
yarn add @zorihq/react
```

## Usage

### 1. Wrap your app with ZoriProvider

```tsx
import { ZoriProvider } from '@zorihq/react';

function App() {
  return (
    <ZoriProvider
      config={{
        publishableKey: 'your-publishable-key',
        baseUrl: 'https://ingestion.zorihq.com/ingest', // optional
        comebackThreshold: 30000, // optional, default 30 seconds
        trackQuickSwitches: false, // optional, default false
      }}
      autoTrackPageViews={true}
    >
      <YourApp />
    </ZoriProvider>
  );
}
```

### 2. Use the hooks

#### useZori - Main Hook

```tsx
import { useZori } from '@zorihq/react';

function MyComponent() {
  const { track, identify, getVisitorId, setConsent, optOut } = useZori();

  const handlePurchase = async () => {
    await track('purchase_completed', {
      product_id: 'prod_123',
      amount: 99.99,
    });
  };

  const handleLogin = async () => {
    await identify({
      app_id: 'user_123',
      email: 'user@example.com',
      fullname: 'John Doe',
    });
  };

  return (
    <div>
      <button onClick={handlePurchase}>Complete Purchase</button>
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
```

#### usePageView - Auto Track Page Views

```tsx
import { usePageView } from '@zorihq/react';

function ProductPage({ productId }) {
  usePageView({
    product_id: productId,
    page_type: 'product',
  });

  return <div>Product {productId}</div>;
}
```

#### useIdentify - Auto Identify Users

```tsx
import { useIdentify } from '@zorihq/react';

function UserProfile({ user }) {
  useIdentify(user ? {
    app_id: user.id,
    email: user.email,
    fullname: user.name,
    plan: user.subscription
  } : null);

  return <div>{user?.name}</div>;
}
```

#### useTrackEvent - Track Events with Dependencies

```tsx
import { useTrackEvent } from '@zorihq/react';

function SearchResults({ query, results }) {
  useTrackEvent(
    'search_completed',
    {
      query,
      result_count: results.length,
    },
    [query, results.length] // Re-track when these change
  );

  return <div>{results.length} results for "{query}"</div>;
}
```

### 3. TrackClick Component

Automatically track clicks on any element:

```tsx
import { TrackClick } from '@zorihq/react';

function MyButton() {
  return (
    <TrackClick
      eventName="signup_clicked"
      properties={{ location: 'header' }}
      as="button"
      className="btn btn-primary"
    >
      Sign Up
    </TrackClick>
  );
}

// Works with any element
function MyLink() {
  return (
    <TrackClick
      eventName="cta_clicked"
      properties={{ cta: 'learn_more' }}
      as="a"
      href="/learn-more"
    >
      Learn More
    </TrackClick>
  );
}
```

## API Reference

### ZoriProvider Props

- `config` (required): Configuration object
  - `publishableKey` (required): Your ZoriHQ publishable key
  - `baseUrl` (optional): Custom ingestion endpoint
  - `comebackThreshold` (optional): Minimum time away to trigger comeback event (ms)
  - `trackQuickSwitches` (optional): Track all visibility changes
- `children` (required): Your app components
- `autoTrackPageViews` (optional): Auto-track page views on mount, default `true`

### useZori Hook

Returns an object with:

- `isInitialized`: Boolean indicating if ZoriHQ is ready
- `track(eventName, properties)`: Track custom events
- `identify(userInfo)`: Identify users
- `getVisitorId()`: Get the visitor ID
- `getSessionId()`: Get the current session ID
- `setConsent(preferences)`: Set GDPR consent preferences
- `optOut()`: Opt out of tracking completely
- `hasConsent()`: Check if user has given consent

## TypeScript Support

This package includes TypeScript definitions out of the box.

```tsx
import { ZoriConfig, UserInfo, ConsentPreferences } from '@zorihq/react';

const config: ZoriConfig = {
  publishableKey: 'your-key',
};

const user: UserInfo = {
  app_id: 'user_123',
  email: 'user@example.com',
};
```

## License

MIT
