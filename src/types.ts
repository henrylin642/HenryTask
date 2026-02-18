export type TaskColor = "red" | "yellow" | "blue";

export type Task = {
  id: string;
  title: string;
  story: string | null;
  createdAt: string;
  completedAt: string | null;
  color: TaskColor;
  position: number;
  deadline: string | null;
  status: "todo" | "done";
  projectId: string | null;
  points: number | null;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
};
