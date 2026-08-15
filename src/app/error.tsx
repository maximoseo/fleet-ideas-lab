"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] px-6">
      <div className="max-w-md text-center">
        <p className="text-4xl">😵</p>
        <h2 className="mt-4 text-xl font-bold text-white">Something went wrong</h2>
        <p className="mt-2 text-sm text-white/50">{error.message || "An unexpected error occurred"}</p>
        <button
          onClick={reset}
          className="mt-6 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
