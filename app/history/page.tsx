import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "*, split_day:split_days(label), session_exercises(id, exercise:exercises(name), sets(weight, reps))"
    )
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col min-h-full pb-20">
      <header className="p-4 pt-6">
        <h1 className="text-2xl font-bold">History</h1>
      </header>

      <main className="flex-1 px-4 space-y-3">
        {!sessions || sessions.length === 0 ? (
          <p className="text-muted text-center py-12">No workouts yet.</p>
        ) : (
          sessions.map((session: Record<string, unknown>) => {
            const s = session as {
              id: string;
              date: string;
              completed_at: string | null;
              split_day: { label: string } | null;
              session_exercises: Array<{
                id: string;
                exercise: { name: string } | null;
                sets: Array<{ weight: number; reps: number }>;
              }>;
            };
            const totalVolume = s.session_exercises.reduce(
              (total, se) =>
                total +
                se.sets.reduce(
                  (v, set) => v + set.weight * set.reps,
                  0
                ),
              0
            );

            return (
              <Link
                key={s.id}
                href={`/history/${s.id}`}
                className="block p-4 rounded-xl border border-card-border bg-card hover:border-muted transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">
                    {s.split_day?.label || "Unknown"}
                  </span>
                  <span className="text-sm text-muted">
                    {new Date(s.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>
                    {s.session_exercises.length} exercises,{" "}
                    {s.session_exercises.reduce(
                      (t, se) => t + se.sets.length,
                      0
                    )}{" "}
                    sets
                  </span>
                  <span>{totalVolume.toLocaleString()} lbs vol</span>
                </div>
                {!s.completed_at && (
                  <span className="inline-block mt-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                    In Progress
                  </span>
                )}
              </Link>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
}
