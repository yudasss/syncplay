import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Initialize theme attribute immediately
try {
  const saved = localStorage.getItem('harmonia-theme-v2') || localStorage.getItem('harmonia-theme');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed?.state) {
      if (parsed.state.theme) document.documentElement.setAttribute('data-theme', parsed.state.theme);
      if (parsed.state.themeMode) document.documentElement.setAttribute('data-theme-mode', parsed.state.themeMode);
    }
  }
} catch (e) {}

// Register PWA Service Worker
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration skipped:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
