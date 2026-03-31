"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session, SessionExercise, Exercise, Set, PreviousSetData } from "@/lib/types";
import ExercisePickerPanel from "@/components/ExercisePickerPanel";

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
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);

  const isEditMode = !!session?.completed_at;

  const loadPreviousSets = useCallback(async (exerciseId: string): Promise<PreviousSetData[]> => {
    const { data: prevSessionExercise } = await supabase
      .from("session_exercises")
      .select("id, session:sessions!inner(started_at)")
      .eq("exercise_id", exerciseId)
      .neq("session_id", sessionId)
      .order("session(started_at)", { ascending: false } as never)
      .limit(1)
      .single();

    if (!prevSessionExercise) return [];

    const { data: prevSets } = await supabase
      .from("sets")
      .select("set_number, weight, reps")
      .eq("session_exercise_id", prevSessionExercise.id)
      .order("set_number");

    return prevSets || [];
  }, [sessionId]);

  const loadSession = useCallback(async () => {
    const { data: sess } = await supabase
      .from("sessions")
      .select("*, split_day:split_days(*)")
      .eq("id", sessionId)
      .single();

    if (!sess) return;
    setSession(sess);

    const { data: sessionExercises } = await supabase
      .from("session_exercises")
      .select("*, exercise:exercises(*), sets(*)")
      .eq("session_id", sessionId)
      .order("order_index");

    if (!sessionExercises) return;

    const exercisesWithPrevious: ExerciseWithSets[] = await Promise.all(
      sessionExercises.map(async (se: SessionExercise & { exercise: Exercise; sets: Set[] }) => {
        const previousSets = await loadPreviousSets(se.exercise_id);
        const sortedSets = [...(se.sets || [])].sort(
          (a, b) => a.set_number - b.set_number
        );
        return { ...se, sets: sortedSets, previousSets };
      })
    );

    setExercises(exercisesWithPrevious);

    // Load all exercises for the picker
    const { data: allEx } = await supabase
      .from("exercises")
      .select("*")
      .eq("is_archived", false)
      .order("muscle_group")
      .order("name");
    setAllExercises((allEx || []) as Exercise[]);

    setLoading(false);
  }, [sessionId, loadPreviousSets]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  async function addSet(sessionExerciseId: string, exerciseIndex: number) {
    setSaving(true);
    const exercise = exercises[exerciseIndex];
    const nextSetNumber = exercise.sets.length + 1;

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

  async function addExerciseToSession(exerciseId: string) {
    setSaving(true);
    const newOrderIndex = exercises.length;

    const { data: newSE } = await supabase
      .from("session_exercises")
      .insert({
        session_id: sessionId,
        exercise_id: exerciseId,
        order_index: newOrderIndex,
      })
      .select("*, exercise:exercises(*)")
      .single();

    if (newSE) {
      const previousSets = await loadPreviousSets(exerciseId);
      const newEntry: ExerciseWithSets = {
        ...(newSE as SessionExercise & { exercise: Exercise }),
        sets: [],
        previousSets,
      };
      setExercises((prev) => [...prev, newEntry]);
      setActiveIndex(newOrderIndex);
    }
    setSaving(false);
    setShowExercisePicker(false);
  }

  async function removeExerciseFromSession(exerciseId: string) {
    const exerciseIndex = exercises.findIndex((e) => e.exercise_id === exerciseId);
    if (exerciseIndex === -1) return;

    const exercise = exercises[exerciseIndex];
    const setCount = exercise.sets.length;

    if (setCount > 0) {
      const confirmed = window.confirm(
        `Remove ${exercise.exercise.name}? This will delete ${setCount} logged set${setCount > 1 ? "s" : ""}.`
      );
      if (!confirmed) return;
    }

    await supabase
      .from("session_exercises")
      .delete()
      .eq("id", exercise.id);

    setExercises((prev) => {
      const updated = prev.filter((_, i) => i !== exerciseIndex);
      return updated;
    });

    // Adjust activeIndex
    if (exercises.length <= 1) {
      setActiveIndex(0);
    } else if (activeIndex >= exercises.length - 1) {
      setActiveIndex(Math.max(0, exercises.length - 2));
    } else if (exerciseIndex < activeIndex) {
      setActiveIndex((prev) => prev - 1);
    }
  }

  async function finishWorkout() {
    if (isEditMode) {
      router.push(`/history/${sessionId}`);
    } else {
      await supabase
        .from("sessions")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", sessionId);
      router.push("/");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Loading workout...</p>
      </div>
    );
  }

  const activeExercise = exercises[activeIndex];
  const currentExerciseIds = exercises.map((e) => e.exercise_id);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="p-4 pt-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold">
            {session?.split_day?.label}
          </h1>
          <p className="text-muted text-xs">
            {isEditMode ? "Editing — " : ""}
            {new Date(session?.date || "").toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={finishWorkout}
          className={`font-semibold px-4 py-2 rounded-xl text-sm text-white ${
            isEditMode ? "bg-accent hover:bg-accent-hover" : "bg-success"
          }`}
        >
          {isEditMode ? "Done" : "Finish"}
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
        {/* Add exercise button */}
        <button
          onClick={() => setShowExercisePicker(true)}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-dashed border-card-border text-accent hover:border-accent transition-colors"
        >
          +
        </button>
      </div>

      {/* Active exercise logging */}
      {activeExercise ? (
        <main className="flex-1 px-4 pt-4 pb-4 overflow-y-auto">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-lg font-bold">
              {activeExercise.exercise.name}
            </h2>
            <button
              onClick={() => removeExerciseFromSession(activeExercise.exercise_id)}
              className="text-danger text-xs font-medium px-2 py-1 shrink-0"
            >
              Remove
            </button>
          </div>
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
            {activeExercise.sets.map((set) => {
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
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
          <p className="text-muted">No exercises in this session.</p>
          <button
            onClick={() => setShowExercisePicker(true)}
            className="bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            + Add Exercise
          </button>
        </main>
      )}

      {/* Exercise Picker Panel */}
      <ExercisePickerPanel
        isOpen={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onAdd={addExerciseToSession}
        onRemove={removeExerciseFromSession}
        allExercises={allExercises}
        currentExerciseIds={currentExerciseIds}
      />
    </div>
  );
}
