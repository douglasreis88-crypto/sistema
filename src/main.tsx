import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import './styles.css'
import './category-chips'

const startApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const router = getRouter()
    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>
    )
  } catch (error: any) {
    console.error('Erro ao iniciar App:', error);
    rootElement.innerHTML = `
      <div style="color: white; padding: 40px; font-family: sans-serif; text-align: center;">
        <h1 style="color: #ff4d4d;">⚠️ Erro de Inicialização</h1>
        <p>O sistema encontrou um problema ao carregar.</p>
        <pre style="background: #222; padding: 20px; border-radius: 8px; text-align: left; display: inline-block;">${error.message}</pre>
        <br><br>
        <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer;">Tentar Novamente</button>
      </div>
    `;
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  startApp();
} else {
  document.addEventListener('DOMContentLoaded', startApp);
}
