import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "*, split_day:split_days(label), session_exercises(id, order_index, exercise:exercises(name, muscle_group), sets(set_number, weight, reps, rpe))"
    )
    .eq("id", id)
    .single();

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Session not found.</p>
      </div>
    );
  }

  const s = session as {
    id: string;
    date: string;
    completed_at: string | null;
    notes: string | null;
    split_day: { label: string } | null;
    session_exercises: Array<{
      id: string;
      order_index: number;
      exercise: { name: string; muscle_group: string } | null;
      sets: Array<{
        set_number: number;
        weight: number;
        reps: number;
        rpe: number | null;
      }>;
    }>;
  };

  const sortedExercises = [...s.session_exercises].sort(
    (a, b) => a.order_index - b.order_index
  );

  return (
    <div className="flex flex-col min-h-full pb-20">
      <header className="p-4 pt-6">
        <div className="flex items-center justify-between mb-2">
          <Link href="/history" className="text-accent text-sm">
            &larr; Back to History
          </Link>
          <Link
            href={`/workout/${id}`}
            className="text-accent text-sm font-medium px-3 py-1.5 rounded-lg border border-accent/30 hover:bg-accent/10 transition-colors"
          >
            Edit Session
          </Link>
        </div>
        <h1 className="text-xl font-bold">{s.split_day?.label}</h1>
        <p className="text-muted text-sm">
          {new Date(s.date).toLocaleDateString()}
          {s.completed_at ? " — Completed" : " — In Progress"}
        </p>
      </header>

      <main className="flex-1 px-4 space-y-4">
        {sortedExercises.map((se) => {
          const sortedSets = [...se.sets].sort(
            (a, b) => a.set_number - b.set_number
          );
          return (
            <div
              key={se.id}
              className="p-4 rounded-xl border border-card-border bg-card"
            >
              <h2 className="font-semibold text-sm mb-1">
                {se.exercise?.name}
              </h2>
              <p className="text-xs text-muted mb-3">
                {se.exercise?.muscle_group}
              </p>
              <div className="space-y-1">
                {sortedSets.map((set) => (
                  <div
                    key={set.set_number}
                    className="flex items-center text-sm"
                  >
                    <span className="w-8 text-muted">
                      S{set.set_number}
                    </span>
                    <span className="font-medium">
                      {set.weight} lbs x {set.reps}
                    </span>
                    {set.rpe && (
                      <span className="text-muted ml-2 text-xs">
                        RPE {set.rpe}
                      </span>
                    )}
                  </div>
                ))}
                {sortedSets.length === 0 && (
                  <p className="text-xs text-muted">No sets logged</p>
                )}
              </div>
            </div>
          );
        })}
      </main>

      <BottomNav />
    </div>
  );
}
