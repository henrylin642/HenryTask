import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
} from "react";
import { supabase } from "./supabase";
import type { Task, TaskColor } from "./types";

type PointerState = {
  active: boolean;
  startX: number;
  startY: number;
  pointerId: number | null;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
};

const toDateInputValue = (value: string | null) => value ?? "";
const parseDateInput = (value: string) => (value ? value : null);

const getMinPosition = (tasks: Task[]) =>
  tasks.length ? Math.min(...tasks.map((task) => task.position)) : 0;

const getMaxPosition = (tasks: Task[]) =>
  tasks.length ? Math.max(...tasks.map((task) => task.position)) : 0;

const TaskRow = ({
  task,
  index,
  isDragging,
  isEditing,
  draftTitle,
  draftDeadline,
  onSetColor,
  onSwipeComplete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftTitleChange,
  onDraftDeadlineChange,
  onEditKeyDown,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
}: {
  task: Task;
  index: number;
  isDragging: boolean;
  isEditing: boolean;
  draftTitle: string;
  draftDeadline: string;
  onSetColor: (taskId: string, color: TaskColor) => void;
  onSwipeComplete: (id: string) => void;
  onStartEdit: (task: Task) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDraftTitleChange: (value: string) => void;
  onDraftDeadlineChange: (value: string) => void;
  onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
}) => {
  const pointer = useRef<PointerState>({
    active: false,
    startX: 0,
    startY: 0,
    pointerId: null,
  });

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!target) return false;
    if (target instanceof Element) {
      return Boolean(
        target.closest("button, input, label, select, textarea, a")
      );
    }
    if (target instanceof Node && target.parentElement) {
      return Boolean(
        target.parentElement.closest("button, input, label, select, textarea, a")
      );
    }
    return false;
  };

  const handlePointerDown = (event: PointerEvent<HTMLLIElement>) => {
    if (isDragging || isEditing) return;
    if (isInteractiveTarget(event.target)) return;
    if (event.pointerType === "mouse") return;
    if (event.pointerType === "pen" && event.button !== 0) return;
    pointer.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLLIElement>) => {
    if (!pointer.current.active || isDragging || isEditing) return;
    const dx = event.clientX - pointer.current.startX;
    const dy = event.clientY - pointer.current.startY;
    if (dx <= 0 || Math.abs(dx) < Math.abs(dy) * 1.3 || Math.abs(dx) < 6) return;
    const clamped = Math.min(dx, 120);
    event.currentTarget.style.setProperty("--swipe", `${clamped}px`);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLLIElement>) => {
    if (!pointer.current.active || isDragging || isEditing) return;
    const dx = event.clientX - pointer.current.startX;
    const dy = event.clientY - pointer.current.startY;
    if (dx > 80 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      onSwipeComplete(task.id);
    }
    event.currentTarget.style.setProperty("--swipe", "0px");
    pointer.current.active = false;
  };

  const handlePointerCancel = (event: PointerEvent<HTMLLIElement>) => {
    event.currentTarget.style.setProperty("--swipe", "0px");
    pointer.current.active = false;
  };

  const deadlineBadge = task.deadline ? formatDate(task.deadline) : "未定";
  const colorOptions: TaskColor[] = ["red", "yellow", "blue"];

  return (
    <li
      className={`task ${isDragging ? "dragging" : ""} ${isEditing ? "editing" : ""}`}
      onDrop={(event) => onDrop(event, task.id)}
      onDragOver={onDragOver}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <button
        className={`color-block ${task.color}`}
        onClick={() => {
          if (!isEditing) onStartEdit(task);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="編輯期限與顏色"
        type="button"
      >
        {deadlineBadge}
      </button>
      <span
        className="drag-handle"
        draggable={!isEditing}
        onDragStart={(event) => onDragStart(event, task.id)}
        onDragEnd={onDragEnd}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="拖曳排序"
        title="拖曳排序"
        role="button"
        tabIndex={0}
      />
      {isEditing ? (
        <>
          <div className="task-main editing">
            <input
              className="edit-title"
              value={draftTitle}
              onChange={(event) => onDraftTitleChange(event.target.value)}
              onKeyDown={onEditKeyDown}
              placeholder="輸入任務內容"
              aria-label="編輯任務"
            />
            <div className="edit-meta">
              <label>
                期限
                <input
                  type="date"
                  value={draftDeadline}
                  onChange={(event) => onDraftDeadlineChange(event.target.value)}
                  aria-label="編輯期限"
                />
              </label>
              <span>顏色</span>
              <div className="color-picker" aria-label="編輯顏色">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch ${color} ${task.color === color ? "active" : ""
                      }`}
                    onClick={() => onSetColor(task.id, color)}
                    aria-label={`設定顏色 ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="edit-actions">
            <button type="button" onClick={onCancelEdit}>
              取消
            </button>
            <button type="button" className="primary" onClick={onSaveEdit}>
              儲存
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="task-main">
            <div className="task-title">{task.title}</div>
          </div>
        </>
      )}
    </li>
  );
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const taskList = useMemo(() => tasks, [tasks]);
  const [title, setTitle] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDeadline, setDraftDeadline] = useState("");

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id,title,created_at,color,position,deadline")
      .order("position", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    const mapped = (data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      createdAt: row.created_at as string,
      color: row.color as TaskColor,
      position: row.position as number,
      deadline: (row.deadline as string | null) ?? null,
    }));
    setTasks(mapped);
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const minPosition = getMinPosition(taskList);
    const position = taskList.length ? minPosition - 1 : 0;
    const { error } = await supabase.from("tasks").insert({
      title: trimmed,
      color: "red",
      position,
      deadline: parseDateInput(deadlineInput),
    });
    if (error) {
      console.error(error);
      return;
    }
    setTitle("");
    setDeadlineInput("");
    void loadTasks();
  };

  const setColor = async (taskId: string, color: TaskColor) => {
    const { error } = await supabase
      .from("tasks")
      .update({ color })
      .eq("id", taskId);
    if (error) {
      console.error(error);
      return;
    }
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, color } : task))
    );
  };

  const completeTask = async (id: string) => {
    const maxPosition = getMaxPosition(taskList);
    const position = taskList.length ? maxPosition + 1 : 0;
    const { error } = await supabase
      .from("tasks")
      .update({ position })
      .eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, position } : task))
    );
  };

  const reorder = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const list = taskList;
    const dragIndex = list.findIndex((task) => task.id === draggedId);
    const targetIndex = list.findIndex((task) => task.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    const nextList = list.filter((task) => task.id !== draggedId);
    const insertIndex = dragIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextList.splice(insertIndex, 0, list[dragIndex]);

    const updates = nextList.map((task, index) => ({
      id: task.id,
      position: index,
    }));
    const { error } = await supabase
      .from("tasks")
      .upsert(updates, { onConflict: "id" });
    if (error) {
      console.error(error);
      return;
    }
    setTasks(
      nextList.map((task, index) => ({
        ...task,
        position: index,
      }))
    );
  };

  const moveToEnd = async (draggedId: string) => {
    const list = taskList;
    const dragIndex = list.findIndex((task) => task.id === draggedId);
    if (dragIndex === -1) return;
    const nextList = list.filter((task) => task.id !== draggedId);
    nextList.push(list[dragIndex]);

    const updates = nextList.map((task, index) => ({
      id: task.id,
      position: index,
    }));
    const { error } = await supabase
      .from("tasks")
      .upsert(updates, { onConflict: "id" });
    if (error) {
      console.error(error);
      return;
    }
    setTasks(
      nextList.map((task, index) => ({
        ...task,
        position: index,
      }))
    );
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, id: string) => {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDragId(id);
  };

  const handleDragEnd = () => {
    setDragId(null);
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || dragId;
    if (!id) return;
    void reorder(id, targetId);
    setDragId(null);
  };

  const handleDropToEnd = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || dragId;
    if (!id) return;
    void moveToEnd(id);
    setDragId(null);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setDraftTitle(task.title);
    setDraftDeadline(toDateInputValue(task.deadline));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = draftTitle.trim();
    if (!trimmed) return;
    const deadline = parseDateInput(draftDeadline);
    const { error } = await supabase
      .from("tasks")
      .update({
        title: trimmed,
        deadline,
      })
      .eq("id", editingId);
    if (error) {
      console.error(error);
      return;
    }
    setEditingId(null);
    setTasks((prev) =>
      prev.map((task) =>
        task.id === editingId ? { ...task, title: trimmed, deadline } : task
      )
    );
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveEdit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div className="app">
      <header>
        <div>
          <div className="eyebrow">極簡待辦</div>
          <h1>單一清單</h1>
        </div>
        <div className="count">{taskList.length}</div>
      </header>

      <form className="composer" onSubmit={addTask}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="新增任務"
          aria-label="任務標題"
        />
        <input
          type="date"
          value={deadlineInput}
          onChange={(event) => setDeadlineInput(event.target.value)}
          aria-label="截止日"
        />
        <button type="submit">加入</button>
      </form>

      <ul className="task-list">
        {taskList.length === 0 && <li className="empty">尚無任務</li>}
        {taskList.map((task, index) => (
          <TaskRow
            key={task.id}
            task={task}
            index={index}
            isDragging={dragId === task.id}
            isEditing={editingId === task.id}
            draftTitle={draftTitle}
            draftDeadline={draftDeadline}
            onSetColor={setColor}
            onSwipeComplete={completeTask}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onSaveEdit={saveEdit}
            onDraftTitleChange={setDraftTitle}
            onDraftDeadlineChange={setDraftDeadline}
            onEditKeyDown={handleEditKeyDown}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          />
        ))}
      </ul>

      {taskList.length > 0 && (
        <div
          className="drop-zone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDropToEnd}
        >
          拖曳到這裡可移到最底部
        </div>
      )}
    </div>
  );
}
