import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

window.__app_id = import.meta.env.VITE_APP_ID || "shopora-maps-dev";
window.__supabase_url = import.meta.env.VITE_SUPABASE_URL || "";
window.__supabase_anon_key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
window.__initial_auth_token = import.meta.env.VITE_INITIAL_AUTH_TOKEN || "";

const envCheck = {
  hasUrl: !!window.__supabase_url,
  hasKey: !!window.__supabase_anon_key,
  urlLength: window.__supabase_url?.length || 0,
  keyLength: window.__supabase_anon_key?.length || 0,
  url: window.__supabase_url || '(empty)',
  keyPreview: window.__supabase_anon_key ? window.__supabase_anon_key.substring(0, 20) + '...' : '(empty)',
  rawEnv: {
    VITE_APP_ID: import.meta.env.VITE_APP_ID,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '***' + import.meta.env.VITE_SUPABASE_ANON_KEY.slice(-10) : undefined
  }
};
console.log('🔍 Environment check:', envCheck);

if (!window.__supabase_url || !window.__supabase_anon_key) {
  console.warn('⚠️ Supabase credentials not set! Please configure your .env file or set the global variables.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

