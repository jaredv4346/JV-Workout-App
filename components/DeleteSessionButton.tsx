"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Delete this session? This cannot be undone.")) return;
    setDeleting(true);
    await supabase.from("sessions").delete().eq("id", sessionId);
    router.push("/history");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-danger text-sm font-medium px-3 py-1.5 rounded-lg border border-danger/30 hover:bg-danger/10 transition-colors disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
