export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-lg text-gray-700">Loading Options AMM...</p>
      </div>
    </div>
  );
}