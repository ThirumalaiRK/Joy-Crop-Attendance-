import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const clientToken = request.headers.get('x-jrm-client-token');
    if (clientToken !== 'jrm_dev_token_secret_1842') {
      return NextResponse.json({ error: 'Unauthorized client signature' }, { status: 401 });
    }

    const body = await request.json();
    const port = body.port || 11100;

    // Send CANCEL request from Node.js server side to local Mantra RD service
    // Server-to-server calls bypass browser CORS limitations completely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    await fetch(`http://127.0.0.1:${port}/rd/capture`, {
      method: 'CANCEL',
      signal: controller.signal,
    }).catch(() => {});

    clearTimeout(timeoutId);
    return NextResponse.json({ success: true, message: 'Scanner cancelled' });
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Cancel failed' });
  }
}
