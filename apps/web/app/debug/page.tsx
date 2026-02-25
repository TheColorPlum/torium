'use client';

import { useEffect, useState } from 'react';

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'app.torium.app' || hostname === 'torium.app') {
      return 'https://torium.app/api/v1';
    }
  }
  return '/api/v1';
}

export default function DebugPage() {
  const [authMeResult, setAuthMeResult] = useState<string>('Loading...');
  const [debugCheckResult, setDebugCheckResult] = useState<string>('Loading...');
  const [hostname, setHostname] = useState<string>('');
  const apiUrl = getApiBase();

  useEffect(() => {
    setHostname(window.location.hostname);
    
    // Test /auth/me
    fetch(`${apiUrl}/auth/me`, {
      credentials: 'include',
    })
      .then(async (res) => {
        const data = await res.json();
        setAuthMeResult(JSON.stringify({ status: res.status, data }, null, 2));
      })
      .catch((err) => {
        setAuthMeResult(`Error: ${err.message}`);
      });

    // Test /auth/debug-check
    fetch(`${apiUrl}/auth/debug-check`, {
      credentials: 'include',
    })
      .then(async (res) => {
        const data = await res.json();
        setDebugCheckResult(JSON.stringify(data, null, 2));
      })
      .catch((err) => {
        setDebugCheckResult(`Error: ${err.message}`);
      });
  }, [apiUrl]);

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', maxWidth: 800 }}>
      <h1>Auth Debug</h1>
      <p><strong>Window hostname:</strong> {hostname}</p>
      <p><strong>API URL:</strong> {apiUrl}</p>
      <p><strong>JS-visible cookies:</strong> {typeof document !== 'undefined' ? document.cookie || '(none - httpOnly cookies are hidden)' : 'N/A'}</p>
      
      <hr style={{ margin: '20px 0' }} />
      
      <h2>Step 1: Set test cookie</h2>
      <p>Visit this URL in a new tab, then come back here:</p>
      <p><a href="https://torium.app/api/v1/auth/debug-redirect" target="_blank" rel="noopener">
        https://torium.app/api/v1/auth/debug-redirect
      </a></p>
      
      <hr style={{ margin: '20px 0' }} />
      
      <h2>Step 2: Check if cookie was received</h2>
      <p><strong>/auth/debug-check response:</strong></p>
      <pre style={{ background: '#f5f5f5', padding: 15, overflow: 'auto' }}>{debugCheckResult}</pre>
      
      <hr style={{ margin: '20px 0' }} />
      
      <h2>Step 3: Auth status</h2>
      <p><strong>/auth/me response:</strong></p>
      <pre style={{ background: '#f5f5f5', padding: 15, overflow: 'auto' }}>{authMeResult}</pre>
      
      <hr style={{ margin: '20px 0' }} />
      
      <p><button onClick={() => window.location.reload()}>Refresh page</button></p>
    </div>
  );
}
