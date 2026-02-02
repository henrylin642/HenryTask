import Dexie, { Table } from "dexie";
import type { Task } from "./types";

class TodoDB extends Dexie {
  tasks!: Table<Task, string>;

  constructor() {
    super("minimal-todo-db");
    this.version(1).stores({
      tasks: "id, position, createdAt, color",
    });
  }
}

export const db = new TodoDB();
