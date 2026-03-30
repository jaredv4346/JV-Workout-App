"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BodyweightLog } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import BodyweightChart from "@/components/BodyweightChart";

export default function BodyweightPage() {
  const [logs, setLogs] = useState<BodyweightLog[]>([]);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayLogged, setTodayLogged] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("bodyweight_logs")
        .select("*")
        .order("date", { ascending: false })
        .limit(90);

      const items = (data || []) as BodyweightLog[];
      setLogs(items);

      const today = new Date().toISOString().split("T")[0];
      const todayEntry = items.find((l) => l.date === today);
      if (todayEntry) {
        setTodayLogged(true);
        setWeight(String(todayEntry.weight));
      }

      setLoading(false);
    }
    load();
  }, []);

  async function logWeight() {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;

    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    if (todayLogged) {
      await supabase
        .from("bodyweight_logs")
        .update({ weight: w })
        .eq("date", today);
    } else {
      await supabase.from("bodyweight_logs").insert({ date: today, weight: w });
    }

    // Refresh
    const { data } = await supabase
      .from("bodyweight_logs")
      .select("*")
      .order("date", { ascending: false })
      .limit(90);

    setLogs((data || []) as BodyweightLog[]);
    setTodayLogged(true);
    setSaving(false);
  }

  // Calculate 7-day rolling average
  const chartData = [...logs].reverse().map((log, idx, arr) => {
    const windowStart = Math.max(0, idx - 6);
    const window = arr.slice(windowStart, idx + 1);
    const avg =
      window.reduce((sum, l) => sum + Number(l.weight), 0) / window.length;
    return {
      date: log.date,
      weight: Number(log.weight),
      avg: Math.round(avg * 10) / 10,
    };
  });

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
        <h1 className="text-2xl font-bold">Bodyweight</h1>
      </header>

      <main className="flex-1 px-4 space-y-4">
        {/* Quick entry */}
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Enter weight (lbs)"
            className="flex-1 bg-card border border-card-border rounded-xl px-4 py-3 text-sm focus:border-accent focus:outline-none"
          />
          <button
            onClick={logWeight}
            disabled={saving || !weight}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold px-5 rounded-xl transition-colors"
          >
            {todayLogged ? "Update" : "Log"}
          </button>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <BodyweightChart data={chartData} />
        ) : (
          <p className="text-muted text-center py-12">
            No bodyweight data yet.
          </p>
        )}

        {/* Recent entries */}
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-2">
            Recent Entries
          </h2>
          {logs.slice(0, 14).map((log) => (
            <div
              key={log.id}
              className="flex justify-between items-center p-3 rounded-xl bg-card border border-card-border"
            >
              <span className="text-sm">
                {new Date(log.date).toLocaleDateString()}
              </span>
              <span className="font-medium">{log.weight} lbs</span>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
