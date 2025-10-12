# ZoriHQ Tracking Script

A lightweight, privacy-focused analytics tracking script with browser fingerprinting capabilities.

## Features

- 🔍 Browser fingerprinting for visitor identification
- 📊 Automatic page view and click tracking
- 🍪 Cookie-based visitor identification
- 🎯 UTM parameter tracking
- 🔒 Privacy-focused design
- 📱 Mobile and desktop support

## Installation

Include the script in your HTML via CDN:

```html
<script src="https://cdn.zorihq.com/script.min.js" data-key="your-publishable-key"></script>
```

### CDN Distribution

This script is distributed via Cloudflare R2 bucket and optimized for:
- ⚡ Fast global delivery via CDN
- 🔒 Obfuscated and minified for production
- 📦 Small footprint (~15KB obfuscated)
- 🛡️ CORS-enabled for cross-origin usage

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build Process

```bash
# Build minified and obfuscated versions
npm run build

# Individual commands
npm run minify    # Create minified version
npm run obfuscate # Create obfuscated version
```

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
2. **Pull Request**: Create PR to `main` branch
3. **Automatic Build**: GitHub Actions builds and tests the code
4. **Merge**: When PR is merged to `main`, semantic-release automatically:
   - Analyzes commits to determine version bump
   - Generates changelog
   - Creates GitHub release with build artifacts
   - Triggers automatic CDN deployment to Cloudflare R2

### Manual Release

To trigger a release manually:

```bash
npm run semantic-release
```

## Build Artifacts

The build process creates:

- `dist/script.min.js` - Minified version
- `dist/script.obfuscated.js` - Obfuscated version  
- `script.min.js` - Production-ready copy (same as obfuscated)

All artifacts are automatically attached to GitHub releases for easy CDN deployment.

## CDN Deployment

### Automated Deployment

The script is automatically deployed to Cloudflare R2 CDN after each release:

- **Versioned URL**: `https://cdn.zorihq.com/v{version}/script.min.js` (immutable, 1-year cache)
- **Latest URL**: `https://cdn.zorihq.com/latest/script.min.js` (5-minute cache)  
- **Root URL**: `https://cdn.zorihq.com/script.min.js` (1-hour cache)

### Manual Deployment

To deploy manually, trigger the workflow:

```bash
gh workflow run deploy-cdn.yml --ref main -f version=v1.2.3
```

Or via GitHub UI: Actions → Deploy to CDN → Run workflow

## GitHub Secrets Required

For automated releases and CDN deployment, configure these secrets in your GitHub repository:

### Release Secrets
- `GITHUB_TOKEN` - Automatically provided by GitHub (no setup needed)

### CDN Deployment Secrets
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token (e.g., `Jl7PqYhoWwCM6nJuAtAZbAzkjuXrHN0KK3bmVRJS`)
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID (e.g., `101a53cb6835c8eb626d34cee920b2db`)
- `CLOUDFLARE_R2_BUCKET_NAME` - Your R2 bucket name
- `CLOUDFLARE_R2_CUSTOM_DOMAIN` - Your custom domain (e.g., `cdn.zorihq.com`)

### Setting up Cloudflare R2

1. **Create R2 bucket** in Cloudflare Dashboard
2. **Generate API token** with R2 permissions:
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with `Zone.Zone:Read`, `Zone.Zone Settings:Edit`, and `Zone.Zone:Edit` permissions
   - Include R2 read/write permissions
3. **Configure custom domain** for your bucket (optional)
4. **Add secrets** to your GitHub repository settings

## License

MIT