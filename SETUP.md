# Setup Instructions

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Or use a version manager like `nvm`:
     ```bash
     nvm install 18
     nvm use 18
     ```

2. **A package manager** (one of the following):
   - npm (comes with Node.js)
   - pnpm: `npm install -g pnpm`
   - yarn: `npm install -g yarn`
   - bun: https://bun.sh/

## Quick Start

### 1. Install Dependencies

Navigate to the web app directory:
```bash
cd apps/web
```

Install dependencies using your preferred package manager:

**With npm:**
```bash
npm install
```

**With pnpm:**
```bash
pnpm install
```

**With yarn:**
```bash
yarn install
```

**With bun:**
```bash
bun install
```

### 2. Start Development Server

**With npm:**
```bash
npm run dev
```

**With pnpm:**
```bash
pnpm dev
```

**With yarn:**
```bash
yarn dev
```

**With bun:**
```bash
bun dev
```

### 3. Open in Browser

The development server will start and display a URL (typically `http://localhost:5173`).

Open this URL in your browser to see the app!

## What You'll See

1. **Code Editor (Left)**: Monaco editor with Python syntax highlighting
2. **Output Panel (Right)**: Shows the results of running your Python code
3. **Run Button**: Click to execute the code (or use Cmd/Ctrl + Enter)
4. **Status Indicator**: Shows Pyodide loading status

## Testing Milestone 1

The app loads with a default Python script that prints "Hello from Python!" and demonstrates basic Python functionality.

Try:
1. Click the "Run" button
2. Verify you see output in the right panel
3. Modify the code
4. Run again with Cmd/Ctrl + Enter

Success criteria:
- ✅ Pyodide loads successfully (status shows "Ready")
- ✅ Code editor is functional
- ✅ Running code produces output
- ✅ Errors are displayed properly

## Troubleshooting

### Port 5173 is already in use

If you see an error about the port being in use, Vite will automatically try the next available port. Check the terminal output for the actual URL.

Or specify a different port:
```bash
npm run dev -- --port 3000
```

### Pyodide fails to load

**Symptoms:** Status shows "Error" or "Failed to load Pyodide"

**Solutions:**
1. Check your internet connection (Pyodide loads from CDN)
2. Check browser console for specific errors
3. Try a different browser
4. Disable browser extensions that might block CDN resources

### Dependencies fail to install

**Symptoms:** npm/pnpm/yarn errors during installation

**Solutions:**
1. Delete `node_modules` and try again:
   ```bash
   rm -rf node_modules
   npm install
   ```
2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
3. Update npm:
   ```bash
   npm install -g npm@latest
   ```

### TypeScript errors

If you see TypeScript errors, try:
```bash
npm run build
```

This will show any compilation errors that need to be fixed.

## Next Steps

Once Milestone 1 is working, the next tasks are:
1. Build Python wheels for `datascience` and `table_tracer`
2. Implement Table method instrumentation
3. Add trace visualization
4. Create example gallery

## Project Structure

```
table-function-visualizer/
├── apps/
│   └── web/                    # Main web application
│       ├── src/                # Source code
│       ├── public/             # Static assets
│       └── package.json        # Dependencies
├── py/                         # Python packages (to be created)
│   ├── datascience/            # (future)
│   └── table_tracer/           # (future)
├── examples/                   # Example scripts (to be created)
├── scripts/                    # Build scripts (to be created)
└── README.md                   # Main project README
```

## Development Tips

1. **Auto-reload**: The dev server auto-reloads when you change files
2. **Hot Module Replacement**: React components update without full page reload
3. **Console**: Check browser console (F12) for errors and logs
4. **Network Tab**: Monitor Pyodide loading in browser DevTools Network tab

## Building for Production

When ready to deploy:

```bash
npm run build
```

This creates an optimized production build in `apps/web/dist/`.

Preview the production build:
```bash
npm run preview
```

The production build can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Any static hosting service

## Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal for build errors
3. Review this setup guide
4. Check `apps/web/README.md` for app-specific details

