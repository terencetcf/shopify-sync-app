export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <h2 className="text-xl font-semibold text-white mt-4">Loading...</h2>
        <p className="text-gray-400 mt-2">
          Please wait while we initialize the application
        </p>
      </div>
    </div>
  );
}
