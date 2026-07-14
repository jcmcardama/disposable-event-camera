// Shown instead of the camera when the event isn't currently open -
// covers all three closed states from the spec: not yet enabled by
// admin, before the start time, and after the end time.

interface EventClosedScreenProps {
  reason: 'disabled' | 'before-start' | 'after-end';
  eventStart: string;
}

const MESSAGES: Record<EventClosedScreenProps['reason'], string> = {
  disabled: "This event hasn't started yet. Check back soon!",
  'before-start': "The event hasn't started yet.",
  'after-end': 'This event has ended. Thanks for being part of it!',
};

export function EventClosedScreen({ reason, eventStart }: EventClosedScreenProps) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-black px-6 text-center text-white">
      <p className="text-lg">{MESSAGES[reason]}</p>
      {reason === 'before-start' && (
        <p className="mt-2 text-sm text-gray-400">
          Starts at {new Date(eventStart).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}