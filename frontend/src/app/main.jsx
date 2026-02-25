import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "leaflet/dist/leaflet.css";

import '@/app/styles/reset.css'
import '@/app/styles/globals.css'

import App from '@/app/App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
