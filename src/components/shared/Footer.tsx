// A small, consistent credit line shown on non-camera screens (admin
// login, admin dashboard, event-closed screen) - deliberately left off
// the camera screen itself, which the spec calls for keeping fully
// minimal and distraction-free.

export function Footer() {
  return (
    <footer className="bg-white py-3 text-center text-xs text-gray-600">
      Jan Carlo M. Cardama © 2026
    </footer>
  );
}