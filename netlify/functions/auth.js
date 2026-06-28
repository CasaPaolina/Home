// Serverless auth endpoint — validates guest/admin passwords server-side.
// The actual passwords live in Netlify env vars and never reach the browser.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false }) };
  }

  const { type, password } = body;

  let expected;
  if (type === 'guest') {
    expected = process.env.GUEST_AREA;
  } else if (type === 'admin') {
    expected = process.env.ADMIN_CHECKIN;
  }

  if (!expected || !password || password !== expected) {
    // Small delay to slow down brute-force attempts
    await new Promise(r => setTimeout(r, 500));
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
