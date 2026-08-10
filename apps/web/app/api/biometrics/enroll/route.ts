import { NextResponse } from 'next/server';
import { registerEnrolledFingerprint } from '../../../../lib/biometrics/fingerprint-store';
import { saveFingerprintTemplateInDb } from '../../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const clientToken = request.headers.get('x-jrm-client-token');
    if (clientToken !== 'jrm_dev_token_secret_1842') {
      return NextResponse.json({ error: 'Unauthorized client signature' }, { status: 401 });
    }

    const body = await request.json();
    const { fingerPrint, externalId } = body;

    if (!externalId || !fingerPrint) {
      return NextResponse.json({ error: 'externalId and fingerPrint are required' }, { status: 400 });
    }

    // Register in global server RAM cache
    registerEnrolledFingerprint(externalId, fingerPrint);

    // Save in Supabase database fingerprint_templates table for local network persistence
    await saveFingerprintTemplateInDb(
      externalId,     // employeeUuid/id
      externalId,     // employeeCode
      'Right Thumb',  // fingerPosition
      fingerPrint,    // fingerTemplate
      98              // qualityScore
    );

    return NextResponse.json({
      code: 200,
      message: 'Success (Fingerprint template registered locally in database)',
    });
  } catch (err: any) {
    console.error('Local biometrics enrollment error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
