export function Spinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-white"
      role="status"
      aria-label="Loading"
    />
  );
}