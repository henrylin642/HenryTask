export type TaskColor = "red" | "yellow" | "blue";

export type Task = {
  id: string;
  title: string;
  createdAt: string;
  color: TaskColor;
  position: number;
  deadline: string | null;
  status: "todo" | "done";
};
