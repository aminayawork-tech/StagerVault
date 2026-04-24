"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900">Something went wrong</h1>
        <div className="bg-gray-100 rounded-lg p-3 text-left">
          <p className="text-xs font-mono text-red-700 break-all">{error?.message || "Unknown error"}</p>
          {error?.digest && (
            <p className="text-xs text-gray-400 mt-1">Error ID: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Go back
          </button>
          <button
            onClick={reset}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
