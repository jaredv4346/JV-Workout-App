"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session, SessionExercise, Exercise, Set, PreviousSetData } from "@/lib/types";

interface ExerciseWithSets extends SessionExercise {
  exercise: Exercise;
  sets: Set[];
  previousSets: PreviousSetData[];
}

export default function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSession = useCallback(async () => {
    // Load session
    const { data: sess } = await supabase
      .from("sessions")
      .select("*, split_day:split_days(*)")
      .eq("id", sessionId)
      .single();

    if (!sess) return;
    setSession(sess);

    // Load session exercises with their sets
    const { data: sessionExercises } = await supabase
      .from("session_exercises")
      .select("*, exercise:exercises(*), sets(*)")
      .eq("session_id", sessionId)
      .order("order_index");

    if (!sessionExercises) return;

    // For each exercise, load the previous session's sets
    const exercisesWithPrevious: ExerciseWithSets[] = await Promise.all(
      sessionExercises.map(async (se: SessionExercise & { exercise: Exercise; sets: Set[] }) => {
        // Find the most recent session_exercise for this exercise before this session
        const { data: prevSessionExercise } = await supabase
          .from("session_exercises")
          .select("id, session:sessions!inner(started_at)")
          .eq("exercise_id", se.exercise_id)
          .neq("session_id", sessionId)
          .order("session(started_at)", { ascending: false } as never)
          .limit(1)
          .single();

        let previousSets: PreviousSetData[] = [];
        if (prevSessionExercise) {
          const { data: prevSets } = await supabase
            .from("sets")
            .select("set_number, weight, reps")
            .eq("session_exercise_id", prevSessionExercise.id)
            .order("set_number");

          previousSets = prevSets || [];
        }

        // Sort sets by set_number
        const sortedSets = [...(se.sets || [])].sort(
          (a, b) => a.set_number - b.set_number
        );

        return { ...se, sets: sortedSets, previousSets };
      })
    );

    setExercises(exercisesWithPrevious);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  async function addSet(sessionExerciseId: string, exerciseIndex: number) {
    setSaving(true);
    const exercise = exercises[exerciseIndex];
    const nextSetNumber = exercise.sets.length + 1;

    // Pre-fill from previous session's corresponding set, or last set in current session
    const prevSet = exercise.previousSets.find(
      (s) => s.set_number === nextSetNumber
    );
    const lastCurrentSet = exercise.sets[exercise.sets.length - 1];

    const weight = prevSet?.weight ?? lastCurrentSet?.weight ?? 0;
    const reps = prevSet?.reps ?? lastCurrentSet?.reps ?? 0;

    const { data: newSet } = await supabase
      .from("sets")
      .insert({
        session_exercise_id: sessionExerciseId,
        set_number: nextSetNumber,
        weight,
        reps,
      })
      .select()
      .single();

    if (newSet) {
      setExercises((prev) =>
        prev.map((e, i) =>
          i === exerciseIndex ? { ...e, sets: [...e.sets, newSet] } : e
        )
      );
    }
    setSaving(false);
  }

  async function updateSet(
    setId: string,
    exerciseIndex: number,
    field: "weight" | "reps" | "rpe",
    value: number
  ) {
    await supabase.from("sets").update({ [field]: value }).eq("id", setId);

    setExercises((prev) =>
      prev.map((e, i) =>
        i === exerciseIndex
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, [field]: value } : s
              ),
            }
          : e
      )
    );
  }

  async function deleteSet(setId: string, exerciseIndex: number) {
    await supabase.from("sets").delete().eq("id", setId);

    setExercises((prev) =>
      prev.map((e, i) =>
        i === exerciseIndex
          ? {
              ...e,
              sets: e.sets
                .filter((s) => s.id !== setId)
                .map((s, idx) => ({ ...s, set_number: idx + 1 })),
            }
          : e
      )
    );
  }

  async function finishWorkout() {
    await supabase
      .from("sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", sessionId);

    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Loading workout...</p>
      </div>
    );
  }

  const activeExercise = exercises[activeIndex];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="p-4 pt-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold">
            {session?.split_day?.label}
          </h1>
          <p className="text-muted text-xs">
            {new Date(session?.date || "").toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={finishWorkout}
          className="bg-success text-white font-semibold px-4 py-2 rounded-xl text-sm"
        >
          Finish
        </button>
      </header>

      {/* Exercise tabs - horizontal scroll */}
      <div className="flex gap-2 px-4 overflow-x-auto shrink-0 pb-2 scrollbar-none">
        {exercises.map((ex, idx) => (
          <button
            key={ex.id}
            onClick={() => setActiveIndex(idx)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              idx === activeIndex
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-muted"
            }`}
          >
            {ex.exercise.name.length > 15
              ? ex.exercise.name.substring(0, 15) + "..."
              : ex.exercise.name}
            {ex.sets.length > 0 && (
              <span className="ml-1 opacity-70">({ex.sets.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Active exercise logging */}
      {activeExercise && (
        <main className="flex-1 px-4 pt-4 pb-4 overflow-y-auto">
          <h2 className="text-lg font-bold mb-1">
            {activeExercise.exercise.name}
          </h2>
          <p className="text-xs text-muted mb-4">
            {activeExercise.exercise.muscle_group}
            {activeExercise.exercise.equipment &&
              ` / ${activeExercise.exercise.equipment}`}
          </p>

          {/* Sets table */}
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 text-xs text-muted font-medium px-1">
              <span>Set</span>
              <span>Previous</span>
              <span>Weight</span>
              <span>Reps</span>
              <span></span>
            </div>

            {/* Set rows */}
            {activeExercise.sets.map((set, setIdx) => {
              const prevSet = activeExercise.previousSets.find(
                (p) => p.set_number === set.set_number
              );
              return (
                <div
                  key={set.id}
                  className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 items-center"
                >
                  <span className="text-sm text-muted font-medium text-center">
                    {set.set_number}
                  </span>
                  <span className="text-xs text-muted">
                    {prevSet
                      ? `${prevSet.weight} x ${prevSet.reps}`
                      : "—"}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={set.weight || ""}
                    onChange={(e) =>
                      updateSet(
                        set.id,
                        activeIndex,
                        "weight",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-card border border-card-border rounded-lg px-2 py-2.5 text-sm text-center font-medium focus:border-accent focus:outline-none"
                    placeholder="lbs"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps || ""}
                    onChange={(e) =>
                      updateSet(
                        set.id,
                        activeIndex,
                        "reps",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full bg-card border border-card-border rounded-lg px-2 py-2.5 text-sm text-center font-medium focus:border-accent focus:outline-none"
                    placeholder="reps"
                  />
                  <button
                    onClick={() => deleteSet(set.id, activeIndex)}
                    className="text-danger text-xs font-bold"
                  >
                    X
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add set button */}
          <button
            onClick={() => addSet(activeExercise.id, activeIndex)}
            disabled={saving}
            className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-card-border text-muted font-medium text-sm hover:border-accent hover:text-accent transition-colors"
          >
            + Add Set
          </button>

          {/* Previous session summary */}
          {activeExercise.previousSets.length > 0 && (
            <div className="mt-6 p-3 rounded-xl bg-card border border-card-border">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                Last Session
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeExercise.previousSets.map((ps) => (
                  <span
                    key={ps.set_number}
                    className="text-xs bg-background px-2 py-1 rounded"
                  >
                    S{ps.set_number}: {ps.weight} x {ps.reps}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nav between exercises */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="flex-1 py-3 rounded-xl border border-card-border text-sm font-medium disabled:opacity-30 transition-colors"
            >
              Previous Exercise
            </button>
            <button
              onClick={() =>
                setActiveIndex(
                  Math.min(exercises.length - 1, activeIndex + 1)
                )
              }
              disabled={activeIndex === exercises.length - 1}
              className="flex-1 py-3 rounded-xl border border-card-border text-sm font-medium disabled:opacity-30 transition-colors"
            >
              Next Exercise
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
