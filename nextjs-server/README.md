# @zorihq/nextjs-server

Server-side tracking for Next.js with ZoriHQ Analytics. Use this in Server Components, API Routes, Server Actions, and Middleware.

## Installation

```bash
npm install @zorihq/nextjs-server
# or
pnpm add @zorihq/nextjs-server
# or
yarn add @zorihq/nextjs-server
```

## Usage

### 1. Initialize the Client

Create `lib/zori-server.ts`:

```typescript
import { createZoriServer } from '@zorihq/nextjs-server';

export const zoriServer = createZoriServer({
  publishableKey: process.env.ZORI_PUBLISHABLE_KEY!,
  baseUrl: 'https://ingestion.zorihq.com/ingest', // optional
});
```

### 2. Track Events in Server Components

```tsx
import { zoriServer } from '@/lib/zori-server';

export default async function ProductPage({ params }: { params: { id: string } }) {
  // Track page view
  await zoriServer.track({
    eventName: 'product_viewed',
    properties: {
      product_id: params.id,
      page_type: 'product',
    },
  });

  return <div>Product {params.id}</div>;
}
```

### 3. Track Events in API Routes (App Router)

```typescript
// app/api/purchase/route.ts
import { NextResponse } from 'next/server';
import { zoriServer } from '@/lib/zori-server';

export async function POST(request: Request) {
  const body = await request.json();

  // Track purchase event
  await zoriServer.track({
    eventName: 'purchase_completed',
    properties: {
      product_id: body.productId,
      amount: body.amount,
    },
  });

  return NextResponse.json({ success: true });
}
```

### 4. Track Events in API Routes (Pages Router)

```typescript
// pages/api/purchase.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { zoriServer } from '@/lib/zori-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    await zoriServer.track({
      eventName: 'purchase_completed',
      properties: {
        product_id: req.body.productId,
        amount: req.body.amount,
      },
    });

    res.status(200).json({ success: true });
  }
}
```

### 5. Identify Users in Server Actions

```typescript
// app/actions.ts
'use server';

import { zoriServer } from '@/lib/zori-server';

export async function loginUser(email: string, userId: string) {
  // Identify user
  await zoriServer.identify({
    userInfo: {
      app_id: userId,
      email: email,
      fullname: 'John Doe',
    },
  });

  // Track login event
  await zoriServer.track({
    eventName: 'user_login',
    properties: {
      method: 'email',
    },
  });

  return { success: true };
}
```

### 6. Track in Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createZoriServer } from '@zorihq/nextjs-server';

const zori = createZoriServer({
  publishableKey: process.env.ZORI_PUBLISHABLE_KEY!,
});

export async function middleware(request: NextRequest) {
  // Track middleware events (e.g., auth checks, redirects)
  await zori.track({
    eventName: 'middleware_check',
    properties: {
      path: request.nextUrl.pathname,
    },
    pageUrl: request.url,
  });

  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};
```

## API Reference

### ZoriServer Class

#### Constructor

```typescript
const zori = new ZoriServer({
  publishableKey: 'your-key', // required
  baseUrl: 'https://ingestion.zorihq.com/ingest', // optional
});
```

#### Methods

##### `track(options: TrackEventOptions): Promise<boolean>`

Track a custom event.

```typescript
await zori.track({
  eventName: 'button_clicked',
  properties: {
    button_name: 'signup',
    location: 'header',
  },
  // Optional overrides:
  visitorId: 'custom-visitor-id',
  sessionId: 'custom-session-id',
  userAgent: 'custom-user-agent',
  pageUrl: 'https://example.com/page',
  host: 'example.com',
  referrer: 'https://google.com',
});
```

##### `identify(options: IdentifyOptions): Promise<boolean>`

Identify a user.

```typescript
await zori.identify({
  userInfo: {
    app_id: 'user_123',
    email: 'user@example.com',
    fullname: 'John Doe',
    plan: 'premium', // Custom properties
    signup_date: '2025-01-15',
  },
  // Optional overrides:
  visitorId: 'custom-visitor-id',
  sessionId: 'custom-session-id',
  userAgent: 'custom-user-agent',
  pageUrl: 'https://example.com/page',
  host: 'example.com',
});
```

##### `getVisitorId(): Promise<string | null>`

Get the current visitor ID from cookies.

```typescript
const visitorId = await zori.getVisitorId();
```

##### `getSessionId(): Promise<string | null>`

Get the current session ID from cookies.

```typescript
const sessionId = await zori.getSessionId();
```

##### `getOrCreateVisitorId(): Promise<string>`

Get or create a visitor ID (sets cookie if not exists).

```typescript
const visitorId = await zori.getOrCreateVisitorId();
```

##### `getOrCreateSessionId(): Promise<string>`

Get or create a session ID (sets cookie if not exists).

```typescript
const sessionId = await zori.getOrCreateSessionId();
```

## Features

### Automatic Cookie Management

The library automatically manages visitor and session cookies:

- `zori_visitor_id` - 2 year expiry
- `zori_session_id` - Browser session expiry

### Automatic Request Metadata

Automatically extracts from Next.js headers:

- User-Agent
- Referrer
- Host

### UTM Parameter Tracking

Automatically extracts UTM parameters from the `pageUrl` option.

## Environment Variables

Create `.env.local`:

```env
ZORI_PUBLISHABLE_KEY=your-publishable-key
```

## Best Practices

1. **Initialize once**: Create a single instance and reuse it across your app
2. **Async/await**: Always await tracking calls in critical paths
3. **Error handling**: Tracking failures won't throw errors but return `false`
4. **Middleware**: Keep middleware tracking lightweight to avoid latency

## TypeScript Support

This package includes full TypeScript definitions.

```typescript
import type {
  ZoriConfig,
  TrackEventOptions,
  IdentifyOptions,
  UserInfo,
} from '@zorihq/nextjs-server';
```

## Client-Side Tracking

For client-side tracking (hooks, components, browser events), use `@zorihq/nextjs` instead.

## License

MIT
