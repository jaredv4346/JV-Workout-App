import { supabase } from "@/lib/supabase";
import type { SplitDay, Session } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getNextSplitDay(): Promise<{
  splitDays: SplitDay[];
  suggestedDay: SplitDay | null;
  lastSession: Session | null;
}> {
  const { data: splitDays } = await supabase
    .from("split_days")
    .select("*")
    .order("order_index");

  const { data: lastSession } = await supabase
    .from("sessions")
    .select("*, split_day:split_days(*)")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  let suggestedDay: SplitDay | null = null;
  if (splitDays && splitDays.length > 0) {
    if (lastSession) {
      const lastIndex = splitDays.findIndex(
        (d: SplitDay) => d.id === lastSession.split_day_id
      );
      const nextIndex = (lastIndex + 1) % splitDays.length;
      suggestedDay = splitDays[nextIndex];
    } else {
      suggestedDay = splitDays[0];
    }
  }

  return {
    splitDays: splitDays || [],
    suggestedDay,
    lastSession: lastSession || null,
  };
}

export default async function HomePage() {
  const { splitDays, suggestedDay, lastSession } = await getNextSplitDay();

  return (
    <div className="flex flex-col min-h-full pb-20">
      <header className="p-4 pt-6">
        <h1 className="text-2xl font-bold">JV Workout</h1>
        <p className="text-muted text-sm mt-1">
          {lastSession
            ? `Last: ${lastSession.split_day?.label} on ${new Date(lastSession.date).toLocaleDateString()}`
            : "No workouts yet. Let's get started!"}
        </p>
      </header>

      <main className="flex-1 px-4 space-y-4">
        {/* Start Workout CTA */}
        {suggestedDay && (
          <Link
            href={`/setup?split=${suggestedDay.id}`}
            className="block w-full bg-accent hover:bg-accent-hover text-white text-center font-semibold text-lg py-4 rounded-xl transition-colors"
          >
            Start: {suggestedDay.label}
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
