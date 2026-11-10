import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress Vite HMR WebSocket error logs in preview environment
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('WebSocket') || event.error?.message?.includes('WebSocket')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (String(event.reason)?.includes('WebSocket')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(<App />);
