/**
 * Renderer Process Entry Point
 *
 * Bootstrap the React application
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './i18n'; // Initialize i18n before the app loads

// Preload Shiki highlighter in background (doesn't block render)
import('./components/ShikiService').then(({ shikiService }) => {
  shikiService.init().catch(() => {});
});

console.log('[Renderer] Starting renderer process...');
console.log('[Renderer] Document ready state:', document.readyState);
console.log('[Renderer] Window electronAPI available:', !!window.electronAPI);

// Get root element
const container = document.getElementById('root');

if (!container) {
  console.error('[Renderer] Root element not found!');
  throw new Error('Root element not found');
}

console.log('[Renderer] Root element found');

// Create React root
const root = createRoot(container);
console.log('[Renderer] React root created');

// Render app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('[Renderer] App rendered successfully');
