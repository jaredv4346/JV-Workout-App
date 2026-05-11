import { supabase } from "@/lib/supabase";
import type { SplitDay, Session } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getHomeData(): Promise<{
  splitDays: SplitDay[];
  suggestedDay: SplitDay | null;
  lastCompletedSession: Session | null;
  activeSession: (Session & { split_day: SplitDay }) | null;
}> {
  const [{ data: splitDays }, { data: lastCompleted }, { data: activeSession }] =
    await Promise.all([
      supabase.from("split_days").select("*").order("order_index"),
      // Rotation is based on last *completed* session only
      supabase
        .from("sessions")
        .select("*, split_day:split_days(*)")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .single(),
      // Separately detect any in-progress session
      supabase
        .from("sessions")
        .select("*, split_day:split_days(*)")
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

  let suggestedDay: SplitDay | null = null;
  if (splitDays && splitDays.length > 0) {
    if (lastCompleted) {
      const lastIndex = splitDays.findIndex(
        (d: SplitDay) => d.id === lastCompleted.split_day_id
      );
      suggestedDay = splitDays[(lastIndex + 1) % splitDays.length];
    } else {
      suggestedDay = splitDays[0];
    }
  }

  return {
    splitDays: splitDays || [],
    suggestedDay,
    lastCompletedSession: lastCompleted || null,
    activeSession: (activeSession as (Session & { split_day: SplitDay })) || null,
  };
}

export default async function HomePage() {
  const { splitDays, suggestedDay, lastCompletedSession, activeSession } =
    await getHomeData();

  return (
    <div className="flex flex-col min-h-full pb-20">
      <header className="p-4 pt-6">
        <h1 className="text-2xl font-bold">JV Workout</h1>
        <p className="text-muted text-sm mt-1">
          {lastCompletedSession
            ? `Last: ${lastCompletedSession.split_day?.label} on ${new Date(lastCompletedSession.date).toLocaleDateString()}`
            : "No workouts yet. Let's get started!"}
        </p>
      </header>

      <main className="flex-1 px-4 space-y-4">
        {/* Continue active session — shown prominently when one is in progress */}
        {activeSession && (
          <Link
            href={`/workout/${activeSession.id}`}
            className="flex items-center justify-between w-full bg-success/15 border border-success/30 text-white px-5 py-4 rounded-xl transition-colors hover:bg-success/20"
          >
            <div>
              <p className="text-xs text-success font-medium uppercase tracking-wide mb-0.5">
                In Progress
              </p>
              <p className="font-semibold">
                Continue: {activeSession.split_day?.label}
              </p>
            </div>
            <span className="text-success text-xl">→</span>
          </Link>
        )}

        {/* Start new workout CTA */}
        {suggestedDay && (
          <Link
            href={`/setup?split=${suggestedDay.id}`}
            className="block w-full bg-accent hover:bg-accent-hover text-white text-center font-semibold text-lg py-4 rounded-xl transition-colors"
          >
            {activeSession ? "New: " : "Start: "}
            {suggestedDay.label}
          </Link>
        )}

        {/* All split days */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide">
            Or choose a day
          </h2>
          {splitDays.map((day) => (
            <Link
              key={day.id}
              href={`/setup?split=${day.id}`}
              className={`block w-full p-4 rounded-xl border transition-colors ${
                day.id === suggestedDay?.id
                  ? "border-accent/30 bg-accent/5"
                  : "border-card-border bg-card hover:border-muted"
              }`}
            >
              <span className="font-medium">{day.label}</span>
              <span className="text-muted text-sm ml-2">
                Day {day.order_index + 1}
              </span>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/exercises"
            className="p-4 rounded-xl border border-card-border bg-card text-center hover:border-muted transition-colors"
          >
            <span className="text-sm font-medium">Exercise Bank</span>
          </Link>
          <Link
            href="/bodyweight"
            className="p-4 rounded-xl border border-card-border bg-card text-center hover:border-muted transition-colors"
          >
            <span className="text-sm font-medium">Log Bodyweight</span>
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
