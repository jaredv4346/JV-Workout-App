export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface SplitDay {
  id: string;
  label: string;
  order_index: number;
  is_archived: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  split_day_id: string;
  date: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  split_day?: SplitDay;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  order_index: number;
  created_at: string;
  exercise?: Exercise;
  sets?: Set[];
}

export interface Set {
  id: string;
  session_exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe: number | null;
  notes: string | null;
  created_at: string;
}

export interface BodyweightLog {
  id: string;
  date: string;
  weight: number;
  created_at: string;
}

export interface PreviousSetData {
  set_number: number;
  weight: number;
  reps: number;
}
