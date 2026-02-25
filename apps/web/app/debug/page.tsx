'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<string>('Loading...');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    
    fetch(`${apiUrl}/auth/me`, {
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
      <p>API URL: {process.env.NEXT_PUBLIC_API_URL || '/api/v1'}</p>
      <p>Cookies present: {typeof document !== 'undefined' ? document.cookie || '(none visible to JS)' : 'N/A'}</p>
      <hr />
      <h2>/auth/me response:</h2>
      <pre>{result}</pre>
    </div>
  );
}
