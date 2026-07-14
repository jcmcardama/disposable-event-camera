// Receives a compressed photo from a guest device, atomically claims
// the next shot number (enforcing the server-side limit), uploads the
// file to Supabase Storage, and records it in the photos table.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getEventStatus } from '@/lib/eventStatus';

export async function POST(request: NextRequest) {
  const eventStatus = await getEventStatus();
  if (!eventStatus.isOpen) {
    return NextResponse.json(
      { error: 'Event is not currently open', reason: eventStatus.reason },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const deviceId = formData.get('deviceId');
  const file = formData.get('file');
  const existingShotNumberRaw = formData.get('shotNumber');

  if (typeof deviceId !== 'string' || !deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('display_name')
    .eq('id', deviceId)
    .single();

  if (deviceError || !device) {
    return NextResponse.json({ error: 'Unknown device' }, { status: 404 });
  }

  // SHOT_LIMIT now comes from event_settings, not a hardcoded constant.
  let shotNumber: number;

  if (typeof existingShotNumberRaw === 'string' && existingShotNumberRaw) {
    shotNumber = Number(existingShotNumberRaw);
  } else {
    const { data: newShotNumber, error: rpcError } = await supabase.rpc(
      'increment_shots_used',
      { p_device_id: deviceId, p_shot_limit: eventStatus.shotLimit }
    );

    if (rpcError) {
      console.error('increment_shots_used failed:', rpcError);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
    if (newShotNumber === null) {
      return NextResponse.json({ error: 'Shot limit reached' }, { status: 403 });
    }
    shotNumber = newShotNumber;
  }

  const fileName = `${device.display_name}-${String(shotNumber).padStart(3, '0')}.jpg`;
  const storagePath = `${deviceId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('event-photos')
    .upload(storagePath, file, { contentType: 'image/jpeg', upsert: true }); // upsert: true - a retry re-uploading the same path should overwrite, not fail

  if (uploadError) {
    console.error('Storage upload failed:', uploadError);
    return NextResponse.json({ error: 'Upload failed', shotNumber }, { status: 500 });
  }

  // upsert on conflict, since a retry may be inserting a row that a
  // previous (storage-failed) attempt never got to inserting - but if
  // it did partially succeed before, this keeps it idempotent.
  const { error: insertError } = await supabase.from('photos').upsert(
    {
      device_id: deviceId,
      shot_number: shotNumber,
      file_name: fileName,
      storage_path: storagePath,
      status: 'uploaded',
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: 'device_id,shot_number' }
  );

  if (insertError) {
    console.error('Photo record insert failed:', insertError);
    return NextResponse.json({ error: 'Server error', shotNumber }, { status: 500 });
  }

  return NextResponse.json({ shotNumber, fileName });
}