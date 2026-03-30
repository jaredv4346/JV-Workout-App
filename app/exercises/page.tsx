"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Exercise } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState("");
  const [newEquipment, setNewEquipment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("exercises")
      .select("*")
      .order("muscle_group")
      .order("name");
    setExercises((data || []) as Exercise[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addExercise() {
    if (!newName.trim() || !newMuscle.trim()) return;
    await supabase.from("exercises").insert({
      name: newName.trim(),
      muscle_group: newMuscle.trim(),
      equipment: newEquipment.trim() || null,
    });
    setNewName("");
    setNewMuscle("");
    setNewEquipment("");
    setShowAdd(false);
    load();
  }

  async function toggleArchive(id: string, currentState: boolean) {
    await supabase
      .from("exercises")
      .update({ is_archived: !currentState })
      .eq("id", id);
    load();
  }

  async function saveEdit(id: string, name: string, muscleGroup: string, equipment: string) {
    await supabase
      .from("exercises")
      .update({ name, muscle_group: muscleGroup, equipment: equipment || null })
      .eq("id", id);
    setEditingId(null);
    load();
  }

  const filteredExercises = exercises.filter((e) => {
    if (!showArchived && e.is_archived) return false;
    if (filter && !e.muscle_group.toLowerCase().includes(filter.toLowerCase()))
      return false;
    return true;
  });

  const muscleGroups = [
    ...new Set(exercises.map((e) => e.muscle_group)),
  ].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-20">
      <header className="p-4 pt-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-accent hover:bg-accent-hover text-white font-semibold px-4 py-2 rounded-xl text-sm"
        >
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </header>

      <main className="flex-1 px-4 space-y-3">
        {/* Add exercise form */}
        {showAdd && (
          <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Exercise name"
              className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
            <input
              value={newMuscle}
              onChange={(e) => setNewMuscle(e.target.value)}
              placeholder="Muscle group"
              className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
            <input
              value={newEquipment}
              onChange={(e) => setNewEquipment(e.target.value)}
              placeholder="Equipment (optional)"
              className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
            <button
              onClick={addExercise}
              className="w-full bg-accent text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Add Exercise
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter("")}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${
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
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${
                filter === mg
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted"
              }`}
            >
              {mg}
            </button>
          ))}
        </div>

        {/* Toggle archived */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="text-xs text-muted underline"
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </button>

        {/* Exercise list */}
        <div className="space-y-1">
          {filteredExercises.map((ex) => (
            <div
              key={ex.id}
              className={`p-3 rounded-xl border bg-card transition-colors ${
                ex.is_archived
                  ? "border-card-border opacity-50"
                  : "border-card-border"
              }`}
            >
              {editingId === ex.id ? (
                <EditExerciseForm
                  exercise={ex}
                  onSave={saveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{ex.name}</p>
                    <p className="text-xs text-muted">
                      {ex.muscle_group}
                      {ex.equipment && ` / ${ex.equipment}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(ex.id)}
                      className="text-xs text-muted px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleArchive(ex.id, ex.is_archived)}
                      className="text-xs text-muted px-2 py-1"
                    >
                      {ex.is_archived ? "Restore" : "Archive"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function EditExerciseForm({
  exercise,
  onSave,
  onCancel,
}: {
  exercise: Exercise;
  onSave: (id: string, name: string, muscleGroup: string, equipment: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(exercise.name);
  const [muscleGroup, setMuscleGroup] = useState(exercise.muscle_group);
  const [equipment, setEquipment] = useState(exercise.equipment || "");

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      <input
        value={muscleGroup}
        onChange={(e) => setMuscleGroup(e.target.value)}
        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      <input
        value={equipment}
        onChange={(e) => setEquipment(e.target.value)}
        placeholder="Equipment"
        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(exercise.id, name, muscleGroup, equipment)}
          className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-card-border py-2 rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
