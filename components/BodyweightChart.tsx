"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; weight: number; avg: number }[];
}

export default function BodyweightChart({ data }: Props) {
  return (
    <div className="w-full h-64 bg-card border border-card-border rounded-xl p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#737373" }}
            tickFormatter={(val) => {
              const d = new Date(val);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#737373" }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#141414",
              border: "1px solid #262626",
              borderRadius: "8px",
              fontSize: 12,
            }}
            labelFormatter={(val) =>
              new Date(val).toLocaleDateString()
            }
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#737373"
            strokeWidth={1}
            dot={{ fill: "#737373", r: 3 }}
            name="Daily"
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="7-Day Avg"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
