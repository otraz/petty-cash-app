// Read-only data feed for dashboard.html.
// Checks the dashboard code server-side, then reads the Excel register through a
// Power Automate flow whose URL is kept in a Netlify environment variable (never sent to the browser).
//   <WORKSPACE>_DASHBOARD_CODE  e.g. TML2026_DASHBOARD_CODE = the code managers type in
//   <WORKSPACE>_DASHBOARD_URL   e.g. TML2026_DASHBOARD_URL  = HTTP URL of the PettyCash_Dashboard_Data flow
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Use POST' }) };
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad request' }) }; }
  const ws = String(body.workspace || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const expected = process.env[ws + '_DASHBOARD_CODE'];
  const url = process.env[ws + '_DASHBOARD_URL'];
  if (!ws || !expected || String(body.code || '').trim().toUpperCase() !== String(expected).trim().toUpperCase()) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid dashboard code' }) };
  }
  if (!url) return { statusCode: 500, headers, body: JSON.stringify({ error: 'The dashboard data feed is not set up yet.' }) };
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!res.ok) throw new Error('Flow returned HTTP ' + res.status);
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.value || data.rows || data.body || []);
    return { statusCode: 200, headers, body: JSON.stringify({ asOf: new Date().toISOString(), rows }) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Could not read the Excel register right now. Try Refresh in a moment.' }) };
  }
};
