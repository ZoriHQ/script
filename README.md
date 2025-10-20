# ZoriHQ Tracking Script

A lightweight analytics tracking script with comprehensive browser fingerprinting and automatic event tracking.

## Features

- 🔍 **Advanced Browser Fingerprinting** - Canvas, WebGL, Audio Context, and hardware fingerprinting
- 📊 **Automatic Event Tracking** - Page views, clicks, visibility changes, and page unloads
- 🆔 **Persistent Visitor Identification** - Cookie-based visitor ID with 2-year expiry
- 🎯 **UTM Parameter Tracking** - Automatic capture of campaign parameters
- 🌐 **Comprehensive Metadata** - User agent, referrer, page URL, and host tracking
- 📍 **Enhanced Click Tracking** - Detects buttons, links, element text, and heatmap data (with screen dimensions)
- 🔌 **JavaScript API** - Custom event tracking and user identification
- 📱 **Cross-Platform Support** - Works on mobile and desktop browsers
- 🔐 **GDPR Compliant** - Built-in consent management, DNT support, and opt-out functionality
- ⏱️ **Session Tracking** - Automatic session management with 30-minute timeout
- 📦 **Event Queue** - Track events before script loads (like gtag.js)
- 🎨 **Heatmap Ready** - Click positions normalized by screen size

## Installation

### Recommended: Async Loading with Event Queue

For optimal performance, initialize the queue before loading the script:

```html
<!-- Initialize queue first -->
<script>
  window.ZoriHQ = window.ZoriHQ || [];
</script>

<!-- Load script asynchronously -->
<script async src="https://cdn.zorihq.com/script.min.js"
        data-key="your-publishable-key"></script>

<!-- Track events immediately (even before script loads) -->
<script>
  window.ZoriHQ.push(['track', 'page_view']);
  window.ZoriHQ.push(['identify', {
    app_id: 'user_123',
    email: 'user@example.com'
  }]);
</script>
```

### Basic Installation

```html
<script src="https://cdn.zorihq.com/script.min.js" data-key="your-publishable-key"></script>
```

### Optional Configuration

You can customize the ingestion endpoint:

```html
<script
  src="https://cdn.zorihq.com/script.min.js"
  data-key="your-publishable-key"
  data-base-url="https://your-custom-endpoint.com/ingest">
</script>
```

### CDN URLs

- **Latest stable**: `https://cdn.zorihq.com/script.min.js`
- **Specific version**: `https://cdn.zorihq.com/v1.0.6/script.min.js`
- **Development/Latest**: `https://cdn.zorihq.com/latest/script.min.js`

## JavaScript API

Once loaded, the script exposes a global `window.ZoriHQ` object for custom tracking:

### Track Custom Events

```javascript
// Direct API (after script loads)
window.ZoriHQ.track('button_clicked', {
  button_name: 'Sign Up',
  page: 'homepage'
});

// Queue method (works before script loads)
window.ZoriHQ.push(['track', 'purchase_completed', {
  product_id: 'prod_123',
  amount: 99.99
}]);
```

### Identify Users

Link visitor cookies to your app users:

```javascript
// Direct API
window.ZoriHQ.identify({
  app_id: 'user_123',           // Your app's user ID
  email: 'user@example.com',    // User email
  fullname: 'John Doe',         // Full name
  plan: 'premium',              // Additional properties
  signup_date: '2025-01-15'
});

// Queue method
window.ZoriHQ.push(['identify', {
  app_id: 'user_123',
  email: 'user@example.com',
  fullname: 'John Doe'
}]);
```

### Consent Management (GDPR)

```javascript
// Grant consent
window.ZoriHQ.setConsent({
  analytics: true,    // Allow analytics
  marketing: false    // Deny marketing
});

// Check consent status
const hasConsent = window.ZoriHQ.hasConsent();

// Opt out completely (GDPR right to be forgotten)
window.ZoriHQ.optOut();

// Queue method
window.ZoriHQ.push(['setConsent', { analytics: true }]);
window.ZoriHQ.push(['optOut']);
```

### Get IDs

```javascript
// Get visitor ID
const visitorId = await window.ZoriHQ.getVisitorId();

// Get current session ID
const sessionId = window.ZoriHQ.getSessionId();

// Queue method with callback
window.ZoriHQ.push(['getVisitorId', function(id) {
  console.log('Visitor ID:', id);
}]);
```

## Automatic Event Tracking

The script automatically tracks:

- **page_view** - On initial load with page title, path, search params, and hash
- **click** - Every click with enhanced element detection:
  - Element type (button, link, input, or clickable)
  - CSS selector (optimized, not 10 levels deep)
  - Element text content
  - Link destination (for links)
  - Click coordinates (x, y)
  - Screen dimensions (for heatmap normalization)
  - Data attributes
- **session_start** - When a new session begins
- **session_end** - When session expires (includes duration and page count)
- **page_hidden** - When user switches tabs or minimizes browser
- **page_visible** - When user returns to the page

All events include:
- Unique visitor ID (persisted for 2 years)
- Session ID (30-minute timeout)
- UTM parameters (if present in URL)
- Referrer
- User agent
- Page URL and host
- Timestamp (UTC)

### Session Tracking

Sessions automatically restart when:
- 30 minutes of inactivity pass
- User arrives with different UTM parameters (new campaign)
- Browser session ends

Session data includes:
- Session duration (milliseconds)
- Page count (pages viewed in session)
- Campaign attribution (preserved from session start)

## Browser Fingerprinting

On first visit, the script generates a comprehensive fingerprint including:

- Screen resolution, color depth, orientation
- Browser properties (user agent, platform, languages, timezone)
- Hardware info (CPU cores, memory, touch points)
- Canvas and WebGL fingerprints
- Audio context fingerprint
- Available media devices
- Network connection info
- Battery status (if available)

The fingerprint is stored in localStorage and used to help identify returning visitors even if cookies are cleared.

## GDPR Compliance

### Consent Management

The script respects user privacy and includes built-in GDPR compliance:

```html
<script>
  window.ZoriHQ = window.ZoriHQ || [];

  // Set consent before tracking starts
  window.ZoriHQ.push(['setConsent', {
    analytics: true,   // Essential analytics
    marketing: false   // Optional marketing
  }]);
</script>
```

### Do Not Track (DNT)

The script automatically respects the browser's Do Not Track header by default. If DNT is enabled, no tracking occurs.

### Right to be Forgotten

Users can completely opt out and delete all their data:

```javascript
window.ZoriHQ.optOut();
// Deletes: cookies, localStorage, blocks future tracking
```

### Cookies Used

| Cookie | Purpose | Expiry | Required |
|--------|---------|--------|----------|
| `zori_visitor_id` | Anonymous visitor tracking | 2 years | Yes (with consent) |
| `zori_session_id` | Session tracking | Browser close | Yes (with consent) |
| `zori_consent` | Consent preferences | 2 years | Always |

### Data Stored

- **Cookies**: Visitor ID, session ID, consent preferences
- **localStorage**: Browser fingerprint, session data, identified user info
- **Server**: Events, timestamps, page URLs, user agents

All data can be deleted via `optOut()` method.

## Development

### Prerequisites

- Node.js 23+
- pnpm 10+

### Setup

```bash
pnpm install
```

### Build Process

```bash
# Build minified version
pnpm run build

# Or run minification directly
pnpm run minify
```

The build creates `dist/script.min.js` (~6.6KB minified).

## Release Process

This project uses semantic versioning with automated releases via GitHub Actions.

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

#### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types
- **feat**: A new feature (triggers minor release)
- **fix**: A bug fix (triggers patch release)
- **perf**: Performance improvements (triggers patch release)
- **docs**: Documentation changes (triggers patch release)
- **refactor**: Code refactoring (triggers patch release)
- **test**: Adding or updating tests (no release)
- **build**: Build system changes (no release)
- **ci**: CI/CD changes (no release)
- **chore**: Maintenance tasks (no release)

#### Breaking Changes
Add `BREAKING CHANGE:` in the footer or `!` after type for major releases:
```
feat!: remove support for legacy browsers

BREAKING CHANGE: This version drops support for Internet Explorer
```

#### Examples
```bash
# Feature (minor release)
git commit -m "feat: add click heatmap tracking"

# Bug fix (patch release)
git commit -m "fix: resolve cookie domain issues"

# Performance improvement (patch release)
git commit -m "perf: optimize fingerprint generation"

# Breaking change (major release)
git commit -m "feat!: redesign tracking API"

# Documentation (patch release)
git commit -m "docs: update installation instructions"

# No release
git commit -m "test: add unit tests for cookie handling"
git commit -m "ci: update GitHub Actions workflow"
git commit -m "chore: update dependencies"
```

### Release Workflow

1. **Development**: Make changes and commit using conventional commit messages
2. **Push to main**: Push directly or merge PR to `main` branch
3. **Automatic Release**: When code is pushed to `main`, semantic-release automatically:
   - Analyzes commits to determine version bump
   - Generates changelog
   - Updates version in package.json
   - Creates git tag
   - Creates GitHub release with build artifacts
4. **Automatic CDN Deployment**: When a git tag is created, the deploy-cdn workflow automatically:
   - Builds the minified script
   - Deploys to Cloudflare R2 at three URLs (versioned, latest, root)
   - Verifies deployment success

## Build Artifacts

The build process creates:

- `dist/script.min.js` - Minified version (~6.6KB)
- `dist/script.obfuscated.js` - Obfuscated version (~45KB) - only for special builds

The minified version is what gets deployed to the CDN.

## CDN Deployment

### Automated Deployment

The script is automatically deployed to Cloudflare R2 when a git tag (e.g., `v1.0.6`) is pushed or a GitHub release is published:

- **Versioned URL**: `https://cdn.zorihq.com/v{version}/script.min.js` - Immutable, cache forever
- **Latest URL**: `https://cdn.zorihq.com/latest/script.min.js` - Always points to newest version
- **Root URL**: `https://cdn.zorihq.com/script.min.js` - Always points to newest version

### Manual Deployment

To deploy a specific version manually:

```bash
gh workflow run deploy-cdn.yml --ref main -f version=v1.2.3
```

Or via GitHub UI: Actions → Deploy to CDN → Run workflow → Enter version

## GitHub Secrets Required

For automated releases and CDN deployment, configure these secrets in your GitHub repository:

### Release Secrets
- `GH_PAT` - Personal Access Token with repo permissions (optional, allows release to trigger deploy)
- `GITHUB_TOKEN` - Automatically provided by GitHub (fallback if PAT not set)

### CDN Deployment Secrets
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with R2 read/write permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_R2_BUCKET_NAME` - Your R2 bucket name (e.g., `zorihq-tracking-script`)
- `CLOUDFLARE_R2_CUSTOM_DOMAIN` - Your custom domain (e.g., `cdn.zorihq.com`)

### Setting Up GitHub PAT (Recommended)

To enable automatic CDN deployment when releases are created:

1. Go to https://github.com/settings/tokens?type=beta
2. Generate new fine-grained token
3. Set repository access to your tracking script repo
4. Grant permissions: Contents (read/write), Metadata (read), Pull requests (read/write)
5. Add as `GH_PAT` secret in your repository settings

Without this, you'll need to manually trigger CDN deployment or rely on the git tag trigger.

### Setting Up Cloudflare R2

1. Create R2 bucket in Cloudflare Dashboard
2. Generate API token with R2 read/write permissions
3. (Optional) Configure custom domain for your bucket
4. Add all secrets to GitHub repository settings → Secrets and variables → Actions

## License

MIT
