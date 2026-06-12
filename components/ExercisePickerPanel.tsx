"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/types";

interface ExercisePickerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (exerciseId: string) => void;
  onRemove: (exerciseId: string) => void;
  allExercises: Exercise[];
  currentExerciseIds: string[];
}

export default function ExercisePickerPanel({
  isOpen,
  onClose,
  onAdd,
  onRemove,
  allExercises,
  currentExerciseIds,
}: ExercisePickerPanelProps) {
  const [filter, setFilter] = useState<string>("");

  if (!isOpen) return null;

  const inSession = allExercises.filter((e) =>
    currentExerciseIds.includes(e.id)
  );
  const available = allExercises.filter(
    (e) => !currentExerciseIds.includes(e.id)
  );

  const muscleGroups = [
    ...new Set(available.map((e) => e.muscle_group)),
  ].sort();

  const filteredAvailable = filter
    ? available.filter((e) => e.muscle_group === filter)
    : available;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-background rounded-t-2xl max-h-[80vh] flex flex-col">
        {/* Handle + header */}
        <div className="flex items-center justify-between p-4 border-b border-card-border shrink-0">
          <h2 className="text-lg font-bold">Edit Exercises</h2>
          <button
            onClick={onClose}
            className="text-muted text-sm font-medium px-2 py-1"
          >
            Done
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-4 space-y-4">
          {/* In session */}
          {inSession.length > 0 && (
            <section>
              <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                In This Workout ({inSession.length})
              </h3>
              <div className="space-y-1">
                {inSession.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center p-3 rounded-xl bg-accent/10 border border-accent/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {ex.name}
                      </p>
                      <p className="text-xs text-muted">{ex.muscle_group}</p>
                    </div>
                    <button
                      onClick={() => onRemove(ex.id)}
                      className="text-danger text-sm font-medium px-2 py-1 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Available */}
          {available.length > 0 && (
            <section>
              <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                Add Exercise
              </h3>

              {/* Muscle group filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-none">
                <button
                  onClick={() => setFilter("")}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !filter
                      ? "bg-accent text-white"
                      : "bg-card border border-card-border text-muted"
                  }`}
                >
                  All
                </button>
                {muscleGroups.map((mg) => (
                  <button
                    key={mg}
                    onClick={() => setFilter(mg)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filter === mg
                        ? "bg-accent text-white"
                        : "bg-card border border-card-border text-muted"
                    }`}
                  >
                    {mg}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                {filteredAvailable.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => onAdd(ex.id)}
                    className="flex items-center w-full p-3 rounded-xl border border-card-border bg-card hover:border-muted transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {ex.name}
                      </p>
                      <p className="text-xs text-muted">{ex.muscle_group}</p>
                    </div>
                    <span className="text-accent text-sm font-medium shrink-0">
                      + Add
                    </span>
                  </button>
                ))}
                {filteredAvailable.length === 0 && (
                  <p className="text-xs text-muted py-2">
                    No exercises in this muscle group.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
