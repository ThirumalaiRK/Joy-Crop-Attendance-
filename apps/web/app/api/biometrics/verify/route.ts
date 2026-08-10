import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const clientToken = request.headers.get('x-jrm-client-token');
    if (clientToken !== 'jrm_dev_token_secret_1842') {
      return NextResponse.json({ error: 'Unauthorized client signature' }, { status: 401 });
    }

    const body = await request.json();
    const { fingerPrint1, fingerPrint2 } = body;

    if (!fingerPrint1 || !fingerPrint2) {
      return NextResponse.json({ error: 'Both fingerprints are required' }, { status: 400 });
    }

    // Local 1-to-1 match calculation
    const matched =
      fingerPrint1 === fingerPrint2 ||
      (fingerPrint1.length > 50 && fingerPrint2.length > 50 && fingerPrint1.slice(0, 50) === fingerPrint2.slice(0, 50));

    return NextResponse.json({
      code: 200,
      message: matched ? 'Success (Match Verified)' : 'Verification Failed (Mismatched Templates)',
      matched: matched ? 1 : 0,
    });
  } catch (err: any) {
    console.error('Local biometrics verification error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
