export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0a14]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
        <p className="text-sm text-white/50">Loading Fleet Ideas Lab…</p>
      </div>
    </div>
  );
}
