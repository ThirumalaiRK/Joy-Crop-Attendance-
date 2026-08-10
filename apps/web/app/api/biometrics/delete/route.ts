import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const clientToken = request.headers.get('x-jrm-client-token');
    if (clientToken !== 'jrm_dev_token_secret_1842') {
      return NextResponse.json({ error: 'Unauthorized client signature' }, { status: 401 });
    }

    const body = await request.json();
    const { externalId } = body;

    if (!externalId) {
      return NextResponse.json({ error: 'externalId is required' }, { status: 400 });
    }

    // Delete fingerprint templates matching this employee from Supabase database locally
    const { error } = await supabase
      .from('fingerprint_templates')
      .delete()
      .or(`employee_code.eq.${externalId},employee_uuid.eq.${externalId}`);

    if (error) {
      console.warn('Supabase local delete template notice:', error.message);
    }

    return NextResponse.json({
      code: 200,
      message: 'Success (Biometric template removed locally from database)',
    });
  } catch (err: any) {
    console.error('Local biometrics delete error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
