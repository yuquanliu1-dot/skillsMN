/**
 * Renderer Process Entry Point
 *
 * Bootstrap the React application
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Get root element
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

// Create React root
const root = createRoot(container);

// Render app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('Renderer process initialized');
