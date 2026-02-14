import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from './App';
import AppNew from './AppNew';
import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppNew />
    </BrowserRouter>
  </React.StrictMode>
);

// Service Worker Registration for Auto-Refresh
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check for updates every minute
      setInterval(() => {
        registration.update();
      }, 60 * 1000);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available; force a reload
            } else {
              // Content is cached for offline use.
            }
          }
        };
      };
    }).catch((registrationError) => {
      // SW registration failed: registrationError
    });
  });

  // Reload page when new SW takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // New content available. Refresh to see changes.
    // User requested NO auto-refresh.
    // window.location.reload(); 
  });
}