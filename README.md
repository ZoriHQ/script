# ZoriHQ Tracking Script

A lightweight analytics tracking script with comprehensive browser fingerprinting and automatic event tracking.

## Features

- 🔍 **Advanced Browser Fingerprinting** - Canvas, WebGL, Audio Context, and hardware fingerprinting
- 📊 **Automatic Event Tracking** - Page views, clicks, visibility changes, and page unloads
- 🆔 **Persistent Visitor Identification** - Cookie-based visitor ID with 2-year expiry
- 🎯 **UTM Parameter Tracking** - Automatic capture of campaign parameters
- 🌐 **Comprehensive Metadata** - User agent, referrer, page URL, and host tracking
- 📍 **Click Position Tracking** - CSS selector and coordinates for every click
- 🔌 **JavaScript API** - Custom event tracking and user identification
- 📱 **Cross-Platform Support** - Works on mobile and desktop browsers

## Installation

Include the script in your HTML with your publishable key:

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
// Track a custom event
window.ZoriHQ.track('button_clicked', {
  button_name: 'Sign Up',
  page: 'homepage'
});

// Track without custom properties
window.ZoriHQ.track('newsletter_signup');
```

### Identify Users

```javascript
// Identify a user with traits
window.ZoriHQ.identify('user_123', {
  email: 'user@example.com',
  plan: 'premium',
  signup_date: '2025-01-15'
});
```

## Automatic Event Tracking

The script automatically tracks:

- **page_view** - On initial load and includes page title, path, search params, and hash
- **click** - Every click with CSS selector and x/y coordinates
- **page_hidden** - When user switches tabs or minimizes browser
- **page_visible** - When user returns to the page
- **page_unload** - When user leaves the page

All events include:
- Unique visitor ID (persisted for 2 years)
- UTM parameters (if present in URL)
- Referrer
- User agent
- Page URL and host
- Timestamp (UTC)

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
