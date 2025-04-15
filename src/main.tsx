import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { FontProvider } from './contexts/FontContext';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

try {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <FontProvider>
            <App />
          </FontProvider>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render application:', error);
  
  rootElement.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-center;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      padding: 20px;
      text-align: center;
      font-family: var(--font-family, system-ui, -apple-system, sans-serif);
    ">
      <div>
        <h1 style="color: #d6001c; font-size: 24px; margin-bottom: 16px;">
          Failed to Load Application
        </h1>
        <p style="color: var(--text-secondary); font-size: 16px;">
          Please refresh the page or contact support if the problem persists.
        </p>
      </div>
    </div>
  `;
}