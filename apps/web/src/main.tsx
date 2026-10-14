import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Automatically direct all relative /api and /uploads calls to the Railway Backend API
const originalFetch = window.fetch;
const RAW_API_URL = import.meta.env.VITE_API_URL || 'https://pdiapi-production.up.railway.app';
const API_BASE_URL = RAW_API_URL.replace(/\/$/, '');

window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let targetInput = input;
  if (typeof input === 'string') {
    if (input.startsWith('/api/') || input.startsWith('/uploads/')) {
      targetInput = `${API_BASE_URL}${input}`;
    }
  } else if (input instanceof URL) {
    if (input.pathname.startsWith('/api/') || input.pathname.startsWith('/uploads/')) {
      targetInput = `${API_BASE_URL}${input.pathname}${input.search}`;
    }
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    try {
      const parsed = new URL(input.url);
      if (parsed.pathname.startsWith('/api/') || parsed.pathname.startsWith('/uploads/')) {
        targetInput = new Request(`${API_BASE_URL}${parsed.pathname}${parsed.search}`, input);
      }
    } catch {
      // Keep original request if URL parsing fails
    }
  }
  return originalFetch.call(this, targetInput, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
