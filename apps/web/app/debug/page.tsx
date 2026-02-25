'use client';

import { useEffect, useState } from 'react';

// Replicate the getApiBase logic for display
function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'app.torium.app' || hostname === 'torium.app') {
      return 'https://torium.app/api/v1';
    }
    if (hostname === 'localhost') {
      return 'http://localhost:8787/api/v1';
    }
  }
  return '/api/v1';
}

export default function DebugPage() {
  const [result, setResult] = useState<string>('Loading...');
  const [apiUrl, setApiUrl] = useState<string>('');

  useEffect(() => {
    const url = getApiBase();
    setApiUrl(url);
    
    fetch(`${url}/auth/me`, {
      credentials: 'include',
    })
      .then(async (res) => {
        const data = await res.json();
        setResult(JSON.stringify({ status: res.status, data }, null, 2));
      })
      .catch((err) => {
        setResult(`Error: ${err.message}`);
      });
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: 'monospace' }}>
      <h1>Auth Debug</h1>
      <p><strong>Build-time env:</strong> {process.env.NEXT_PUBLIC_API_URL || '(NOT SET - using fallback)'}</p>
      <p><strong>Resolved API URL:</strong> {apiUrl}</p>
      <p><strong>Window hostname:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</p>
      <p><strong>Cookies (JS-visible):</strong> {typeof document !== 'undefined' ? document.cookie || '(none - httpOnly cookies are hidden)' : 'N/A'}</p>
      <hr />
      <h2>/auth/me response:</h2>
      <pre>{result}</pre>
    </div>
  );
}
