import React, { useState } from 'react';

function App() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSummary('');

    try {
      // FIXED: Switched to localhost to perfectly align with backend CORS origin policies
      const res = await fetch('http://localhost:5005/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: url })
      });

      // FIXED: Add explicit status response check before attempting to parse JSON payloads
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorJson = JSON.parse(errorText);
          setSummary(`Server Error: ${errorJson.error || errorJson.details}`);
        } catch {
          setSummary(`Server returned status code ${res.status}: ${errorText.substring(0, 100)}`);
        }
        return;
      }

      const data = await res.json();
      setSummary(data.summary);
      
    } catch (err) {
      // Network layer failure fallback capture mechanism
      setSummary(`Failed to communicate with Node.js server. Details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>GenAI YouTube Summarizer</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="url" 
          placeholder="Paste YouTube Link (e.g., https://youtube.com...)" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          required 
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#ccc' : '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          {loading ? 'Analyzing Transcript...' : 'Generate Summary'}
        </button>
      </form>
      {summary && (
        <div style={{ marginTop: '30px', background: '#f4f4f4', padding: '20px', borderRadius: '8px', whiteSpace: 'pre-line', borderLeft: '5px solid #0070f3' }}>
          <h3>AI Summary:</h3>
          <p style={{ lineHeight: '1.6' }}>{summary}</p>
        </div>
      )}
    </div>
  );
}

export default App;
