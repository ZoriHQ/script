# @zorihq/nextjs

Next.js client-side hooks and components for ZoriHQ Analytics.

## Installation

```bash
npm install @zorihq/nextjs
# or
pnpm add @zorihq/nextjs
# or
yarn add @zorihq/nextjs
```

## Usage with App Router (Next.js 13+)

### 1. Create a Client Component Wrapper

Create `app/providers.tsx`:

```tsx
'use client';

import { ZoriProvider } from '@zorihq/nextjs';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ZoriProvider
      config={{
        publishableKey: process.env.NEXT_PUBLIC_ZORI_KEY!,
        baseUrl: 'https://ingestion.zorihq.com/ingest', // optional
        comebackThreshold: 30000, // optional
        trackQuickSwitches: false, // optional
      }}
      autoTrackPageViews={true} // Auto-tracks route changes
    >
      {children}
    </ZoriProvider>
  );
}
```

### 2. Wrap Your Root Layout

Update `app/layout.tsx`:

```tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 3. Use in Client Components

```tsx
'use client';

import { useZori } from '@zorihq/nextjs';

export default function MyPage() {
  const { track, identify } = useZori();

  const handlePurchase = async () => {
    await track('purchase_completed', {
      product_id: 'prod_123',
      amount: 99.99,
    });
  };

  return (
    <button onClick={handlePurchase}>
      Complete Purchase
    </button>
  );
}
```

## Usage with Pages Router (Next.js 12)

### 1. Wrap Your App

Update `pages/_app.tsx`:

```tsx
import { ZoriProvider } from '@zorihq/nextjs';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ZoriProvider
      config={{
        publishableKey: process.env.NEXT_PUBLIC_ZORI_KEY!,
      }}
      autoTrackPageViews={true}
    >
      <Component {...pageProps} />
    </ZoriProvider>
  );
}
```

## Features

### Auto Route Tracking

The `ZoriProvider` automatically tracks route changes in both App Router and Pages Router when `autoTrackPageViews={true}` is set.

### Track Events

```tsx
'use client';

import { useZori } from '@zorihq/nextjs';

function MyComponent() {
  const { track } = useZori();

  const handleClick = () => {
    track('button_clicked', { button_name: 'signup' });
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
```

### Identify Users

```tsx
'use client';

import { useIdentify } from '@zorihq/nextjs';

function UserProfile({ user }) {
  useIdentify(user ? {
    app_id: user.id,
    email: user.email,
    fullname: user.name,
  } : null);

  return <div>{user?.name}</div>;
}
```

### TrackClick Component

```tsx
'use client';

import { TrackClick } from '@zorihq/nextjs';

function MyButton() {
  return (
    <TrackClick
      eventName="cta_clicked"
      properties={{ location: 'hero' }}
      as="button"
      className="btn"
    >
      Get Started
    </TrackClick>
  );
}
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_ZORI_KEY=your-publishable-key
```

## API Reference

### ZoriProvider Props

- `config` (required): Configuration object
  - `publishableKey` (required): Your ZoriHQ publishable key
  - `baseUrl` (optional): Custom ingestion endpoint
  - `comebackThreshold` (optional): Minimum time away to trigger comeback event (ms)
  - `trackQuickSwitches` (optional): Track all visibility changes
- `children` (required): Your app components
- `autoTrackPageViews` (optional): Auto-track page views on route change, default `true`

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

## Server-Side Tracking

For server-side tracking (Server Components, API Routes, Middleware), use `@zorihq/nextjs-server` instead.

## License

MIT
