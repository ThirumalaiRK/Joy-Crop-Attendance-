import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BUCKET_NAME = 'employee-avatars';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const employeeId = formData.get('employeeId') as string | null;

    if (!file || !employeeId) {
      return NextResponse.json(
        { error: 'File and employeeId are required.' },
        { status: 400 }
      );
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit.' },
        { status: 400 }
      );
    }

    // Validate MIME type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WEBP images are allowed.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'webp';
    const filePath = `avatars/${employeeId}/avatar_${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Avatar Upload Error]', uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Retrieve public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Update employees record
    try {
      await supabaseAdmin
        .from('employees')
        .update({
          avatar: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);
    } catch (e: any) {
      console.warn('[Avatar] employees update notice:', e?.message);
    }

    // Write Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_name: 'THIRUMALAI R K (Super Admin)',
        target_employee_id: String(employeeId),
        action: 'AVATAR_UPLOADED',
        entity_type: 'EMPLOYEE_AVATAR',
        entity_id: String(employeeId),
        details: `Uploaded new profile photo for employee ${employeeId} to storage (${filePath}).`,
        new_value: { avatar_url: publicUrl },
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser Admin',
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      employeeId,
      avatarUrl: publicUrl,
      message: 'Avatar uploaded and updated successfully!',
    });
  } catch (err: any) {
    console.error('[Avatar Exception]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error uploading avatar.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId parameter required.' }, { status: 400 });
    }

    // Update employees table
    try {
      await supabaseAdmin
        .from('employees')
        .update({
          avatar: null,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);
    } catch (_) {}

    // Write Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_name: 'THIRUMALAI R K (Super Admin)',
        target_employee_id: String(employeeId),
        action: 'AVATAR_REMOVED',
        entity_type: 'EMPLOYEE_AVATAR',
        entity_id: String(employeeId),
        details: `Removed profile avatar photo for employee ${employeeId}. Fallback initials avatar active.`,
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser Admin',
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      employeeId,
      message: 'Avatar removed successfully. Initials fallback active.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error removing avatar.' },
      { status: 500 }
    );
  }
}
