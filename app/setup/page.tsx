"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import type { Exercise, SplitDay, SessionExercise } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

// Mapping of split days to relevant muscle groups
const splitMuscleGroups: Record<string, string[]> = {
  Push: ["Chest", "Shoulders", "Triceps"],
  Pull: ["Back", "Biceps"],
  Legs: ["Quads", "Glutes", "Hamstrings", "Calves"],
  Upper: ["Chest", "Shoulders", "Triceps", "Back", "Biceps"],
  Lower: ["Quads", "Glutes", "Hamstrings", "Calves", "Core"],
};

function SetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const splitId = searchParams.get("split");

  const [splitDay, setSplitDay] = useState<SplitDay | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!splitId) return;

    async function load() {
      // Get split day info
      const { data: split } = await supabase
        .from("split_days")
        .select("*")
        .eq("id", splitId)
        .single();

      if (!split) return;
      setSplitDay(split);

      // Get relevant muscle groups for this split
      const muscleGroups = splitMuscleGroups[split.label] || [];

      // Get all non-archived exercises for these muscle groups
      const { data: allExercises } = await supabase
        .from("exercises")
        .select("*")
        .eq("is_archived", false)
        .in("muscle_group", muscleGroups)
        .order("muscle_group")
        .order("name");

      setExercises(allExercises || []);

      // Check last session for this split day to pre-populate
      const { data: lastSession } = await supabase
        .from("sessions")
        .select("id")
        .eq("split_day_id", splitId)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (lastSession) {
        const { data: lastExercises } = await supabase
          .from("session_exercises")
          .select("exercise_id")
          .eq("session_id", lastSession.id)
          .order("order_index");

        if (lastExercises && lastExercises.length > 0) {
          setSelectedIds(
            lastExercises.map((e: { exercise_id: string }) => e.exercise_id)
          );
          setLoading(false);
          return;
        }
      }

      // Default: select first 5 exercises
      if (allExercises) {
        setSelectedIds(allExercises.slice(0, 5).map((e) => e.id));
      }
      setLoading(false);
    }

    load();
  }, [splitId]);

  function toggleExercise(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const newSelected = [...selectedIds];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newSelected.length) return;
    [newSelected[index], newSelected[newIndex]] = [
      newSelected[newIndex],
      newSelected[index],
    ];
    setSelectedIds(newSelected);
  }

  async function startWorkout() {
    if (selectedIds.length === 0 || !splitId) return;
    setStarting(true);

    // Create session
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({ split_day_id: splitId })
      .select()
      .single();

    if (error || !session) {
      setStarting(false);
      return;
    }

    // Create session exercises
    const sessionExercises = selectedIds.map((exerciseId, index) => ({
      session_id: session.id,
      exercise_id: exerciseId,
      order_index: index,
    }));

    await supabase.from("session_exercises").insert(sessionExercises);

    router.push(`/workout/${session.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const selectedExercises = selectedIds
    .map((id) => exercises.find((e) => e.id === id))
    .filter(Boolean) as Exercise[];

  const unselectedExercises = exercises.filter(
    (e) => !selectedIds.includes(e.id)
  );

  return (
    <div className="flex flex-col min-h-full pb-20">
      <header className="p-4 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{splitDay?.label}</h1>
          <p className="text-muted text-sm">Select exercises for this session</p>
        </div>
        <button
          onClick={startWorkout}
          disabled={selectedIds.length === 0 || starting}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          {starting ? "Starting..." : "Start"}
        </button>
      </header>

      <main className="flex-1 px-4 space-y-4">
        {/* Selected exercises - reorderable */}
        {selectedExercises.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-2">
              Selected ({selectedExercises.length})
            </h2>
            <div className="space-y-1">
              {selectedExercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveExercise(index, -1)}
                      disabled={index === 0}
                      className="text-xs text-muted disabled:opacity-30 px-1"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveExercise(index, 1)}
                      disabled={index === selectedExercises.length - 1}
                      className="text-xs text-muted disabled:opacity-30 px-1"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {exercise.name}
                    </p>
                    <p className="text-xs text-muted">{exercise.muscle_group}</p>
                  </div>
                  <button
                    onClick={() => toggleExercise(exercise.id)}
                    className="text-danger text-sm font-medium px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available exercises */}
        {unselectedExercises.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-2">
              Available
            </h2>
            <div className="space-y-1">
              {unselectedExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => toggleExercise(exercise.id)}
                  className="flex items-center w-full p-3 rounded-xl border border-card-border bg-card hover:border-muted transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {exercise.name}
                    </p>
                    <p className="text-xs text-muted">{exercise.muscle_group}</p>
                  </div>
                  <span className="text-accent text-sm font-medium">+ Add</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted">Loading...</p>
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}
