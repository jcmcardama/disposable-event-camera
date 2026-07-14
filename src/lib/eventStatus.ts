// Single source of truth for "is the event currently open, and what's
// the shot limit." Used by both /api/event-status (for the client's UI)
// and /api/upload (for actual enforcement) - so there's only one place
// that ever reasons about event_settings.

import { createSupabaseServerClient } from './supabase/server';

export type EventStatus =
| { isOpen: true; reason: 'open'; eventStart: string; eventEnd: string; shotLimit: number }
| {
    isOpen: false;
    reason: 'disabled' | 'before-start' | 'after-end';
    eventStart: string;
    eventEnd: string;
    shotLimit: number;
};

export async function getEventStatus(): Promise<EventStatus> {
  const supabase = createSupabaseServerClient();

  const { data: settings, error } = await supabase
    .from('event_settings')
    .select('*')
    .eq('id', 1)
    .single();

  // If settings can't be read at all, fail closed (event is NOT open) -
  // reliability principle applies here too: better to block guests
  // with a clear message than to silently allow uploads with no
  // real limit backing them.
  if (error || !settings) {
    console.error('Failed to load event_settings:', error);
    return {
      isOpen: false,
      reason: 'disabled',
      eventStart: '',
      eventEnd: '',
      shotLimit: 5,
    };
  }

  const now = Date.now();
  const start = new Date(settings.event_start).getTime();
  const end = new Date(settings.event_end).getTime();

  const shared = {
    eventStart: settings.event_start,
    eventEnd: settings.event_end,
    shotLimit: settings.shot_limit,
  };

  if (!settings.is_enabled) {
    return { isOpen: false, reason: 'disabled', ...shared };
  }
  if (now < start) {
    return { isOpen: false, reason: 'before-start', ...shared };
  }
  if (now > end) {
    return { isOpen: false, reason: 'after-end', ...shared };
  }
  return { isOpen: true, reason: 'open', ...shared };
}
