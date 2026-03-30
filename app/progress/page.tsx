"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Exercise } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import ProgressChart from "@/components/ProgressChart";

type TimeRange = "4w" | "8w" | "12w" | "all";
type Metric = "e1rm" | "volume" | "topset";

export default function ProgressPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("8w");
  const [metric, setMetric] = useState<Metric>("e1rm");
  const [chartData, setChartData] = useState<
    { date: string; value: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExercises() {
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .eq("is_archived", false)
        .order("muscle_group")
        .order("name");
      setExercises(data || []);
      if (data && data.length > 0) setSelectedExercise(data[0].id);
      setLoading(false);
    }
    loadExercises();
  }, []);

  useEffect(() => {
    if (!selectedExercise) return;

    async function loadData() {
      let dateFilter = "";
      const now = new Date();
      if (timeRange === "4w") {
        dateFilter = new Date(
          now.getTime() - 28 * 24 * 60 * 60 * 1000
        ).toISOString();
      } else if (timeRange === "8w") {
        dateFilter = new Date(
          now.getTime() - 56 * 24 * 60 * 60 * 1000
        ).toISOString();
      } else if (timeRange === "12w") {
        dateFilter = new Date(
          now.getTime() - 84 * 24 * 60 * 60 * 1000
        ).toISOString();
      }

      let query = supabase
        .from("session_exercises")
        .select(
          "id, session:sessions!inner(date, started_at), sets(weight, reps)"
        )
        .eq("exercise_id", selectedExercise)
        .order("session(started_at)", { ascending: true } as never);

      if (dateFilter) {
        query = query.gte("session.started_at" as never, dateFilter);
      }

      const { data } = await query;

      if (!data) {
        setChartData([]);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const points = (data as any[]).map((se) => {
        const sets: { weight: number; reps: number }[] = se.sets || [];
        const sessionDate: string = Array.isArray(se.session)
          ? se.session[0]?.date
          : se.session?.date;
        let value = 0;

        if (metric === "e1rm") {
          // Epley formula: weight * (1 + reps/30)
          value = Math.max(
            ...sets.map((s) =>
              s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30)
            ),
            0
          );
        } else if (metric === "volume") {
          value = sets.reduce((v, s) => v + s.weight * s.reps, 0);
        } else if (metric === "topset") {
          value = Math.max(...sets.map((s) => s.weight), 0);
        }

        return {
          date: sessionDate,
          value: Math.round(value * 10) / 10,
        };
      });

      setChartData(points);
    }

    loadData();
  }, [selectedExercise, timeRange, metric]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-20">
      <header className="p-4 pt-6">
        <h1 className="text-2xl font-bold">Progress</h1>
      </header>

      <main className="flex-1 px-4 space-y-4">
        {/* Exercise selector */}
        <select
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="w-full bg-card border border-card-border rounded-xl px-3 py-3 text-sm focus:border-accent focus:outline-none"
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name} ({ex.muscle_group})
            </option>
          ))}
        </select>

        {/* Metric toggle */}
        <div className="flex gap-2">
          {(
            [
              ["e1rm", "Est. 1RM"],
              ["volume", "Volume"],
              ["topset", "Top Set"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                metric === key
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Time range toggle */}
        <div className="flex gap-2">
          {(
            [
              ["4w", "4 Weeks"],
              ["8w", "8 Weeks"],
              ["12w", "12 Weeks"],
              ["all", "All Time"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                timeRange === key
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Chart */}
        {chartData.length === 0 ? (
          <p className="text-muted text-center py-12">
            No data yet for this exercise.
          </p>
        ) : (
          <ProgressChart
            data={chartData}
            metric={metric}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
