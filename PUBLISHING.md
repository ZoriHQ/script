# Publishing Framework Libraries

This document describes how to publish the ZoriHQ framework libraries to npm.

## Prerequisites

### 1. NPM Token

You need to configure an NPM authentication token in GitHub Secrets:

1. Create an npm account at https://www.npmjs.com/
2. Generate an automation token: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
3. Add it to GitHub repository secrets as `NPM_TOKEN`

### 2. Package Scope

All packages are published under the `@zorihq` scope:
- `@zorihq/react`
- `@zorihq/nextjs`
- `@zorihq/nextjs-server`
- `@zorihq/vue`
- `@zorihq/svelte`

Ensure you have permission to publish to this scope on npm.

## Publishing Workflow

### Automatic Publishing via GitHub Actions

The workflow `publish-packages.yml` handles building, versioning, and publishing packages to npm.

#### Publish a Single Package

1. Go to **Actions** → **Publish Framework Packages**
2. Click **Run workflow**
3. Select options:
   - **Package**: Choose which package to publish (react, nextjs, nextjs-server, vue, svelte)
   - **Version bump type**: Choose `patch`, `minor`, or `major`
   - **Dry run**: Check this to test without actually publishing

#### Publish All Packages

1. Go to **Actions** → **Publish Framework Packages**
2. Click **Run workflow**
3. Select options:
   - **Package**: Choose `all`
   - **Version bump type**: Choose `patch`, `minor`, or `major`
   - **Dry run**: Check this to test without actually publishing

### What the Workflow Does

1. **Checks out code** from the repository
2. **Installs dependencies** for the selected package(s)
3. **Verifies package files** to ensure everything is ready
4. **Bumps version** according to your selection (patch, minor, major)
5. **Publishes to npm** with public access
6. **Commits version bump** back to the repository
7. **Creates git tag** in format `{package}/v{version}` (e.g., `react/v1.0.1`)
8. **Creates GitHub Release** with installation instructions

## Manual Publishing (Local)

If you need to publish manually from your local machine:

### 1. Login to npm

```bash
npm login
```

### 2. Navigate to Package Directory

```bash
cd react  # or nextjs, nextjs-server, vue, svelte
```

### 3. Bump Version

```bash
npm version patch  # or minor, major
```

### 4. Publish

```bash
npm publish --access public
```

### 5. Tag and Push

```bash
git add package.json
git commit -m "chore(react): release v1.0.1"
git tag react/v1.0.1
git push origin main --tags
```

## Version Bump Guidelines

Follow semantic versioning:

- **patch** (1.0.0 → 1.0.1): Bug fixes, small improvements
- **minor** (1.0.0 → 1.1.0): New features, backward compatible
- **major** (1.0.0 → 2.0.0): Breaking changes

## Package Structure

Each package is published with source files (TypeScript/TSX) to allow users' build systems to handle compilation:

```
@zorihq/react/
├── index.tsx          # Main source file
├── README.md          # Usage documentation
├── package.json       # Package manifest
└── tsconfig.json      # TypeScript config
```

## Verifying Published Packages

After publishing, verify on npm:

```bash
npm view @zorihq/react
npm view @zorihq/nextjs
npm view @zorihq/nextjs-server
npm view @zorihq/vue
npm view @zorihq/svelte
```

Or visit:
- https://www.npmjs.com/package/@zorihq/react
- https://www.npmjs.com/package/@zorihq/nextjs
- https://www.npmjs.com/package/@zorihq/nextjs-server
- https://www.npmjs.com/package/@zorihq/vue
- https://www.npmjs.com/package/@zorihq/svelte

## Testing Before Publishing

### Dry Run with GitHub Actions

Always test with dry-run enabled first:

1. Run the workflow with **dry-run: true**
2. Check the workflow logs to see what would be published
3. If everything looks good, run again with **dry-run: false**

### Local Testing

Test package locally before publishing:

```bash
cd react
npm pack
# This creates a .tgz file you can inspect or install locally
```

Install the packed version in a test project:

```bash
npm install /path/to/zorihq-react-1.0.0.tgz
```

## Troubleshooting

### "You do not have permission to publish"

- Ensure you're logged into the correct npm account
- Ensure you have access to the `@zorihq` scope
- Check that `NPM_TOKEN` secret is correctly configured

### "Version already exists"

- You're trying to publish a version that's already on npm
- Bump the version first with `npm version patch/minor/major`

### "Files not included in package"

- Check the `files` field in `package.json`
- Run `npm pack --dry-run` to see what would be included
- Verify source files exist in the package directory

## CI/CD Integration

The workflow integrates with GitHub's CI/CD:

- **On workflow_dispatch**: Manual trigger from GitHub Actions UI
- **Permissions**: Requires `contents: write` and `packages: write`
- **Matrix strategy**: Can publish multiple packages in parallel when `all` is selected

## Post-Publishing

After publishing:

1. **Update documentation** if needed
2. **Announce release** in relevant channels
3. **Monitor npm** for download stats
4. **Watch for issues** reported by users

## Best Practices

1. ✅ **Always use dry-run first** for new packages
2. ✅ **Test locally** before publishing
3. ✅ **Follow semantic versioning** strictly
4. ✅ **Update README** with breaking changes
5. ✅ **Tag releases** with descriptive names
6. ✅ **Keep changelogs** updated
7. ✅ **Coordinate releases** when updating multiple packages

## Package URLs

After publishing, packages are available at:

- **npm**: `https://www.npmjs.com/package/@zorihq/{package-name}`
- **GitHub**: `https://github.com/ZoriHQ/script/tree/main/{package-name}`
- **Unpkg CDN**: `https://unpkg.com/@zorihq/{package-name}` (for bundled builds)

## Support

For issues with publishing:

1. Check GitHub Actions logs for detailed error messages
2. Verify npm credentials and permissions
3. Review package.json configuration
4. Test with `npm pack --dry-run` locally

## License

All packages are published under the MIT License.
