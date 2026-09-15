/// <reference types="vite/client" />

/** Injected by vite.config.ts: git commit or build time, used to version the service worker cache */
declare const __BUILD_ID__: string;

/** Monaco reads its worker factory from here (set in src/lib/monacoSetup.ts) */
interface Window {
  MonacoEnvironment?: { getWorker: (workerId: string, label: string) => Worker };
}
