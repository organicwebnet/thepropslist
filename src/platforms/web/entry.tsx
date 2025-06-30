import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../App.tsx';
import '../../index.css';

// Ensure proper web viewport
const meta = document.createElement('meta');
meta.name = 'viewport';
meta.content = 'width=device-width, initial-scale=1, shrink-to-fit=no';
document.head.appendChild(meta);

// Create root container if it doesn't exist
const rootElement = document.getElementById('root') || document.createElement('div');
if (!rootElement.id) {
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

// Initialize the app
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 
