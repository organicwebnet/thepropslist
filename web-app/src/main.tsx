import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { FirebaseProvider } from './contexts/FirebaseContext'
import { WebAuthProvider } from './contexts/WebAuthContext'

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <FirebaseProvider>
      <WebAuthProvider>
        <App />
      </WebAuthProvider>
    </FirebaseProvider>
  </React.StrictMode>,
) 