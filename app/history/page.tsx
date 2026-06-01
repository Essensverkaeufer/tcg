import { AppShell } from "@/components/AppShell";

export default function HistoryPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black">Match History</h1>
        <div className="mt-6 rounded-lg border border-slate-200 bg-white">
          {["Queued prototype match", "Win/loss rows will read from MatchPlayer", "Action logs support replay debugging"].map((row) => (
            <div key={row} className="border-b border-slate-100 p-4 text-sm last:border-b-0">{row}</div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
