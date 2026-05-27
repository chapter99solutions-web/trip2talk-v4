export default function AwaitingSync({ label = 'AWAITING SYNC' }: { label?: string }) {
  return (
    <div className="cyber-card p-8 flex flex-col items-center justify-center text-center min-h-[120px]">
      <p className="font-mono text-amber-400/80 text-base tracking-wide animate-pulse">{label}</p>
      <p className="font-mono text-neutral-500 text-sm mt-2 tracking-wide">
        SUPABASE CONNECTION REQUIRED
      </p>
    </div>
  );
}
