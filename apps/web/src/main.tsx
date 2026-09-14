import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PYODIDE_VERSION } from './lib/pyodide'
import './index.css'

// Register the service worker under the deployed base path. The query string versions it:
// a new build id replaces the app cache, and a new Pyodide version replaces the package cache.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js?v=${encodeURIComponent(__BUILD_ID__)}&py=${encodeURIComponent(PYODIDE_VERSION)}`
    navigator.serviceWorker.register(swUrl)
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

