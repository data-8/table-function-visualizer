# Deployment Guide

## Deploy to GitHub Pages

### Prerequisites

1. Push your code to GitHub
2. Enable GitHub Pages in repository settings

### Automatic Deployment (Recommended)

The project includes a GitHub Actions workflow for automatic deployment.

#### Setup

1. Go to your GitHub repository
2. Click **Settings** > **Pages**
3. Under **Build and deployment**:
   - Source: **GitHub Actions**
4. Push to `main` branch - deployment happens automatically

The workflow file is at `.github/workflows/deploy.yml`

#### What Happens

- On every push to `main`, the app builds and deploys
- Build takes ~2-3 minutes
- Site available at: `https://data-8.github.io/table-function-visualizer/`

### Manual Deployment

If you prefer manual deployment:

```bash
# Navigate to web app
cd apps/web

# Install dependencies
npm install

# Build for production
npm run build

# Deploy (requires gh-pages package)
npm install -g gh-pages
gh-pages -d dist
```

### Configuration

The `vite.config.ts` is configured with:
- Base path: `/table-function-visualizer/` (production)
- Base path: `/` (development)

If your repository has a different name, update the base path in `vite.config.ts`:

```typescript
base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/'
```

### Testing Deployment

After deployment:

1. Visit: `https://data-8.github.io/table-function-visualizer/`
2. Test all features:
   - Examples gallery loads
   - Code execution works
   - Pyodide initializes
   - Service worker caches assets
   - Export and share work

### Troubleshooting

#### Blank Page

- Check base path in `vite.config.ts` matches repository name
- Verify GitHub Pages is enabled
- Check browser console for errors

#### 404 Errors for Assets

- Ensure base path is correct
- Verify all assets are in `dist/` folder
- Check network tab in browser DevTools

#### Pyodide Not Loading

- Pyodide loads from CDN - check internet connection
- Wait for initialization (5-10 seconds first time)
- Check browser console for errors

#### Service Worker Issues

- Service workers require HTTPS (GitHub Pages provides this)
- Clear browser cache and reload
- Check Application > Service Workers in DevTools

### Custom Domain (Optional)

To use a custom domain:

1. Add `CNAME` file to `apps/web/public/` with your domain
2. Configure DNS records with your domain provider
3. Enable "Enforce HTTPS" in repository settings

### Build Optimization

The production build:
- Minifies JavaScript and CSS
- Removes source maps
- Optimizes assets
- Typical size: ~2-3 MB (including Monaco Editor)

Note: Pyodide (~20 MB) loads from CDN, not bundled.

### Continuous Deployment

The GitHub Actions workflow automatically:
1. Checks out code
2. Sets up Node.js
3. Installs dependencies
4. Builds the app
5. Deploys to GitHub Pages

To disable automatic deployment:
- Delete `.github/workflows/deploy.yml`
- Or disable Actions in repository settings

### Environment Variables

No environment variables needed - everything is configured for GitHub Pages by default.

### Monitoring

After deployment, monitor:
- GitHub Actions tab for build status
- Browser console for runtime errors
- Network tab for asset loading

### Rollback

To rollback to a previous version:
1. Go to Actions tab
2. Find successful previous deployment
3. Re-run that workflow

Or manually:
```bash
git checkout <previous-commit>
cd apps/web
npm run build
gh-pages -d dist
```

### Production Checklist

Before deploying:
- [ ] All features tested locally
- [ ] No console errors
- [ ] Examples work correctly
- [ ] Service worker registered
- [ ] Permalinks working
- [ ] Export functionality works
- [ ] Documentation up to date
- [ ] README reflects current features

