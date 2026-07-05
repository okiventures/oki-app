import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_LIMIT = 50;

serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 1. Atomically claim pending items using UPDATE ... RETURNING
    // This prevents duplicate processing across concurrent runs without a separate lock step.
    const { data: queueItems, error: fetchError } = await supabase
      .from('notification_queue')
      .update({ status: 'PROCESSING' })
      .eq('status', 'PENDING')
      .lte('send_at', new Date().toISOString())
      .select(
        `
        id,
        booking_id,
        handyman_id,
        handymen!inner (
          expo_push_token
        )
      `
      )
      .limit(BATCH_LIMIT);

    if (fetchError) throw fetchError;
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending notifications.' }), {
        status: 200,
      });
    }

    // 2. Send push notifications in parallel
    const results = await Promise.allSettled(
      queueItems.map(async (item: any) => {
        const pushToken = item.handymen?.expo_push_token;
        if (!pushToken) {
          await supabase
            .from('notification_queue')
            .update({ status: 'FAILED', error_log: 'No Expo push token on handyman profile' })
            .eq('id', item.id);
          return;
        }

        try {
          const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: pushToken,
              sound: 'default',
              title: 'Upcoming Scheduled Job',
              body: 'You have a scheduled service job starting soon. Open the app to view details.',
              data: { bookingId: item.booking_id, type: 'SCHEDULED_JOB_ALERT' },
            }),
          });

          if (!response.ok) {
            const body = await response.text();
            throw new Error(`Expo API error ${response.status}: ${body}`);
          }

          await supabase.from('notification_queue').update({ status: 'SENT' }).eq('id', item.id);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          await supabase
            .from('notification_queue')
            .update({ status: 'FAILED', error_log: message })
            .eq('id', item.id);
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ success: true, processed: queueItems.length, sent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
