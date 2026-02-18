import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import type { Project, Task } from "./types";

type ViewTab = "board" | "done" | "projects";

type Section = {
  key: string;
  title: string;
  tasks: Task[];
};

const localDateISO = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDateInput = (value: string) => (value ? value : null);
const toDateInputValue = (value: string | null) => value ?? "";

const formatDate = (value: string | null) => {
  if (!value) return "未排程";
  const date = new Date(`${value}T00:00:00`);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
};

const weekBounds = (todayIso: string) => {
  const today = new Date(`${todayIso}T00:00:00`);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: localDateISO(start),
    end: localDateISO(end),
  };
};

const inRange = (value: string, start: string, end: string) => value >= start && value <= end;

function StoryTaskRow({
  task,
  project,
  isEditing,
  draftTitle,
  draftStory,
  draftDeadline,
  draftProjectId,
  draftPoints,
  projects,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftTitleChange,
  onDraftStoryChange,
  onDraftDeadlineChange,
  onDraftProjectChange,
  onDraftPointsChange,
  onEditKeyDown,
}: {
  task: Task;
  project: Project | null;
  isEditing: boolean;
  draftTitle: string;
  draftStory: string;
  draftDeadline: string;
  draftProjectId: string;
  draftPoints: string;
  projects: Project[];
  onToggle: (task: Task) => void;
  onStartEdit: (task: Task) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDraftTitleChange: (value: string) => void;
  onDraftStoryChange: (value: string) => void;
  onDraftDeadlineChange: (value: string) => void;
  onDraftProjectChange: (value: string) => void;
  onDraftPointsChange: (value: string) => void;
  onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <li className={`story-task ${task.status === "done" ? "done" : ""}`}>
      <label className="task-check" aria-label="切換完成狀態">
        <input
          type="checkbox"
          checked={task.status === "done"}
          onChange={() => onToggle(task)}
        />
        <span />
      </label>

      {isEditing ? (
        <div className="task-editing">
          <input
            value={draftTitle}
            onChange={(event) => onDraftTitleChange(event.target.value)}
            onKeyDown={onEditKeyDown}
            placeholder="Story Task 標題"
          />
          <input
            value={draftStory}
            onChange={(event) => onDraftStoryChange(event.target.value)}
            placeholder="Story 描述（As a..., I want...）"
          />
          <div className="edit-grid">
            <input
              type="date"
              value={draftDeadline}
              onChange={(event) => onDraftDeadlineChange(event.target.value)}
              aria-label="Story 截止日"
            />
            <select
              value={draftProjectId}
              onChange={(event) => onDraftProjectChange(event.target.value)}
              aria-label="Story 專案"
            >
              <option value="">未指定專案</option>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={draftPoints}
              onChange={(event) => onDraftPointsChange(event.target.value)}
              aria-label="Story 點數"
            >
              <option value="">無點數</option>
              {[1, 2, 3, 5, 8, 13].map((point) => (
                <option key={point} value={point}>
                  {point} pt
                </option>
              ))}
            </select>
          </div>
          <div className="row-actions">
            <button type="button" onClick={onCancelEdit}>
              取消
            </button>
            <button type="button" className="primary" onClick={onSaveEdit}>
              儲存
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="task-content">
            <div className="task-title">{task.title}</div>
            {task.story && <div className="task-story">{task.story}</div>}
            <div className="task-meta">
              <span>{formatDate(task.deadline)}</span>
              <span>{project ? project.name : "未指定專案"}</span>
              <span>{task.points ? `${task.points} pt` : "無點數"}</span>
            </div>
          </div>
          <button type="button" className="ghost" onClick={() => onStartEdit(task)}>
            編輯
          </button>
        </>
      )}
    </li>
  );
}

export default function App() {
  const [view, setView] = useState<ViewTab>("board");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string>("");

  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [projectIdInput, setProjectIdInput] = useState("");
  const [pointsInput, setPointsInput] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStory, setDraftStory] = useState("");
  const [draftDeadline, setDraftDeadline] = useState("");
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftPoints, setDraftPoints] = useState("");

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#1f7a8c");
  const [projectEditingId, setProjectEditingId] = useState<string | null>(null);
  const [projectDraftName, setProjectDraftName] = useState("");
  const [projectDraftDesc, setProjectDraftDesc] = useState("");

  const projectMap = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]));
  }, [projects]);

  const todoTasks = useMemo(
    () => tasks.filter((task) => task.status === "todo").sort((a, b) => a.position - b.position),
    [tasks]
  );

  const doneTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === "done")
        .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt)),
    [tasks]
  );

  const sections = useMemo(() => {
    const today = localDateISO();
    const { start, end } = weekBounds(today);

    const overdue: Task[] = [];
    const todayItems: Task[] = [];
    const weekItems: Task[] = [];
    const unscheduled: Task[] = [];
    const later: Task[] = [];

    todoTasks.forEach((task) => {
      if (!task.deadline) {
        unscheduled.push(task);
        return;
      }
      if (task.deadline < today) {
        overdue.push(task);
        return;
      }
      if (task.deadline === today) {
        todayItems.push(task);
        return;
      }
      if (inRange(task.deadline, start, end)) {
        weekItems.push(task);
        return;
      }
      later.push(task);
    });

    const result: Section[] = [];
    if (overdue.length) result.push({ key: "overdue", title: "逾期", tasks: overdue });
    result.push({ key: "today", title: "本日工作", tasks: todayItems });
    result.push({ key: "week", title: "本週工作", tasks: weekItems });
    result.push({ key: "unscheduled", title: "未分配日期", tasks: unscheduled });
    if (later.length) result.push({ key: "later", title: "稍後", tasks: later });
    return result;
  }, [todoTasks]);

  const projectUsage = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((task) => {
      if (!task.projectId) return;
      map.set(task.projectId, (map.get(task.projectId) ?? 0) + 1);
    });
    return map;
  }, [tasks]);

  const loadProjects = async () => {
    const { data, error: projectError } = await supabase
      .from("projects")
      .select("id,name,description,color,created_at")
      .order("created_at", { ascending: true });

    if (projectError) {
      setError(projectError.message);
      return;
    }

    const mapped: Project[] = (data ?? []).map((item) => ({
      id: item.id as string,
      name: item.name as string,
      description: (item.description as string | null) ?? null,
      color: (item.color as string) ?? "#1f7a8c",
      createdAt: item.created_at as string,
    }));
    setProjects(mapped);
  };

  const loadTasks = async () => {
    const { data, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id,title,story,created_at,completed_at,color,position,deadline,status,project_id,points"
      )
      .order("position", { ascending: true });

    if (taskError) {
      setError(taskError.message);
      return;
    }

    const mapped: Task[] = (data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      story: (row.story as string | null) ?? null,
      createdAt: row.created_at as string,
      completedAt: (row.completed_at as string | null) ?? null,
      color: (row.color as Task["color"]) ?? "red",
      position: (row.position as number) ?? 0,
      deadline: (row.deadline as string | null) ?? null,
      status: (row.status as Task["status"]) ?? "todo",
      projectId: (row.project_id as string | null) ?? null,
      points: (row.points as number | null) ?? null,
    }));
    setTasks(mapped);
  };

  const loadData = async () => {
    setError("");
    await Promise.all([loadProjects(), loadTasks()]);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const maxPosition = todoTasks.length ? Math.max(...todoTasks.map((task) => task.position)) : 0;
    const position = maxPosition + 1000;

    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({
        title: trimmed,
        story: story.trim() || null,
        color: "red",
        position,
        deadline: parseDateInput(deadlineInput),
        status: "todo",
        project_id: projectIdInput || null,
        points: pointsInput ? Number(pointsInput) : null,
      })
      .select(
        "id,title,story,created_at,completed_at,color,position,deadline,status,project_id,points"
      )
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const created: Task = {
      id: data.id as string,
      title: data.title as string,
      story: (data.story as string | null) ?? null,
      createdAt: data.created_at as string,
      completedAt: (data.completed_at as string | null) ?? null,
      color: (data.color as Task["color"]) ?? "red",
      position: (data.position as number) ?? position,
      deadline: (data.deadline as string | null) ?? null,
      status: (data.status as Task["status"]) ?? "todo",
      projectId: (data.project_id as string | null) ?? null,
      points: (data.points as number | null) ?? null,
    };

    setTasks((prev) => [...prev, created]);
    setTitle("");
    setStory("");
    setDeadlineInput("");
    setProjectIdInput("");
    setPointsInput("");
  };

  const toggleTask = async (task: Task) => {
    const nextStatus: Task["status"] = task.status === "done" ? "todo" : "done";
    const completedAt = nextStatus === "done" ? new Date().toISOString() : null;

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status: nextStatus, completed_at: completedAt })
      .eq("id", task.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, status: nextStatus, completedAt } : item
      )
    );
  };

  const startTaskEdit = (task: Task) => {
    setEditingId(task.id);
    setDraftTitle(task.title);
    setDraftStory(task.story ?? "");
    setDraftDeadline(toDateInputValue(task.deadline));
    setDraftProjectId(task.projectId ?? "");
    setDraftPoints(task.points ? String(task.points) : "");
  };

  const cancelTaskEdit = () => {
    setEditingId(null);
  };

  const saveTaskEdit = async () => {
    if (!editingId) return;
    const trimmed = draftTitle.trim();
    if (!trimmed) return;

    const payload = {
      title: trimmed,
      story: draftStory.trim() || null,
      deadline: parseDateInput(draftDeadline),
      project_id: draftProjectId || null,
      points: draftPoints ? Number(draftPoints) : null,
    };

    const { error: updateError } = await supabase.from("tasks").update(payload).eq("id", editingId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === editingId
          ? {
              ...task,
              title: payload.title,
              story: payload.story,
              deadline: payload.deadline,
              projectId: payload.project_id,
              points: payload.points,
            }
          : task
      )
    );

    setEditingId(null);
  };

  const handleTaskEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveTaskEdit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelTaskEdit();
    }
  };

  const addProject = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) return;

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        name: trimmed,
        description: newProjectDesc.trim() || null,
        color: newProjectColor,
      })
      .select("id,name,description,color,created_at")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setProjects((prev) => [
      ...prev,
      {
        id: data.id as string,
        name: data.name as string,
        description: (data.description as string | null) ?? null,
        color: (data.color as string) ?? "#1f7a8c",
        createdAt: data.created_at as string,
      },
    ]);

    setNewProjectName("");
    setNewProjectDesc("");
    setNewProjectColor("#1f7a8c");
  };

  const startProjectEdit = (project: Project) => {
    setProjectEditingId(project.id);
    setProjectDraftName(project.name);
    setProjectDraftDesc(project.description ?? "");
  };

  const saveProjectEdit = async () => {
    if (!projectEditingId) return;
    const trimmed = projectDraftName.trim();
    if (!trimmed) return;

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        name: trimmed,
        description: projectDraftDesc.trim() || null,
      })
      .eq("id", projectEditingId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectEditingId
          ? { ...project, name: trimmed, description: projectDraftDesc.trim() || null }
          : project
      )
    );

    setProjectEditingId(null);
  };

  const deleteProject = async (id: string) => {
    const { error: deleteError } = await supabase.from("projects").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setProjects((prev) => prev.filter((project) => project.id !== id));
    setTasks((prev) => prev.map((task) => (task.projectId === id ? { ...task, projectId: null } : task)));
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">Story Task Workspace</div>
          <h1>Henry Task</h1>
        </div>
        <div className="stats">
          <div>
            <strong>{todoTasks.length}</strong>
            <span>待辦</span>
          </div>
          <div>
            <strong>{doneTasks.length}</strong>
            <span>完成</span>
          </div>
        </div>
      </header>

      <nav className="tabs" aria-label="主選單">
        <button
          type="button"
          className={view === "board" ? "active" : ""}
          onClick={() => setView("board")}
        >
          Story Board
        </button>
        <button
          type="button"
          className={view === "done" ? "active" : ""}
          onClick={() => setView("done")}
        >
          已完成頁面
        </button>
        <button
          type="button"
          className={view === "projects" ? "active" : ""}
          onClick={() => setView("projects")}
        >
          Projects
        </button>
      </nav>

      {error && <div className="error">{error}</div>}

      {view === "board" && (
        <>
          <form className="composer" onSubmit={addTask}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="新增 Story Task"
              aria-label="Story Task 標題"
            />
            <input
              value={story}
              onChange={(event) => setStory(event.target.value)}
              placeholder="Story 描述（As a..., I want...）"
              aria-label="Story 描述"
            />
            <div className="composer-grid">
              <input
                type="date"
                value={deadlineInput}
                onChange={(event) => setDeadlineInput(event.target.value)}
                aria-label="截止日"
              />
              <select
                value={projectIdInput}
                onChange={(event) => setProjectIdInput(event.target.value)}
                aria-label="專案"
              >
                <option value="">未指定專案</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={pointsInput}
                onChange={(event) => setPointsInput(event.target.value)}
                aria-label="Story 點數"
              >
                <option value="">無點數</option>
                {[1, 2, 3, 5, 8, 13].map((point) => (
                  <option key={point} value={point}>
                    {point} pt
                  </option>
                ))}
              </select>
              <button type="submit">加入</button>
            </div>
          </form>

          <div className="board">
            {sections.map((section) => (
              <section key={section.key} className="board-section">
                <h2>{section.title}</h2>
                {section.tasks.length === 0 ? (
                  <div className="empty">目前沒有項目</div>
                ) : (
                  <ul className="task-list">
                    {section.tasks.map((task) => (
                      <StoryTaskRow
                        key={task.id}
                        task={task}
                        project={task.projectId ? projectMap.get(task.projectId) ?? null : null}
                        isEditing={editingId === task.id}
                        draftTitle={draftTitle}
                        draftStory={draftStory}
                        draftDeadline={draftDeadline}
                        draftProjectId={draftProjectId}
                        draftPoints={draftPoints}
                        projects={projects}
                        onToggle={toggleTask}
                        onStartEdit={startTaskEdit}
                        onCancelEdit={cancelTaskEdit}
                        onSaveEdit={saveTaskEdit}
                        onDraftTitleChange={setDraftTitle}
                        onDraftStoryChange={setDraftStory}
                        onDraftDeadlineChange={setDraftDeadline}
                        onDraftProjectChange={setDraftProjectId}
                        onDraftPointsChange={setDraftPoints}
                        onEditKeyDown={handleTaskEditKeyDown}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {view === "done" && (
        <section className="board-section">
          <h2>已完成項目</h2>
          {doneTasks.length === 0 ? (
            <div className="empty">目前沒有已完成項目</div>
          ) : (
            <ul className="task-list">
              {doneTasks.map((task) => (
                <StoryTaskRow
                  key={task.id}
                  task={task}
                  project={task.projectId ? projectMap.get(task.projectId) ?? null : null}
                  isEditing={editingId === task.id}
                  draftTitle={draftTitle}
                  draftStory={draftStory}
                  draftDeadline={draftDeadline}
                  draftProjectId={draftProjectId}
                  draftPoints={draftPoints}
                  projects={projects}
                  onToggle={toggleTask}
                  onStartEdit={startTaskEdit}
                  onCancelEdit={cancelTaskEdit}
                  onSaveEdit={saveTaskEdit}
                  onDraftTitleChange={setDraftTitle}
                  onDraftStoryChange={setDraftStory}
                  onDraftDeadlineChange={setDraftDeadline}
                  onDraftProjectChange={setDraftProjectId}
                  onDraftPointsChange={setDraftPoints}
                  onEditKeyDown={handleTaskEditKeyDown}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {view === "projects" && (
        <section className="board-section">
          <h2>Project 編輯</h2>

          <form className="project-form" onSubmit={addProject}>
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Project 名稱"
              aria-label="Project 名稱"
            />
            <input
              value={newProjectDesc}
              onChange={(event) => setNewProjectDesc(event.target.value)}
              placeholder="Project 說明（可選）"
              aria-label="Project 說明"
            />
            <div className="project-form-grid">
              <input
                type="color"
                value={newProjectColor}
                onChange={(event) => setNewProjectColor(event.target.value)}
                aria-label="Project 顏色"
              />
              <button type="submit">新增 Project</button>
            </div>
          </form>

          <ul className="project-list">
            {projects.map((project) => (
              <li key={project.id} className="project-item">
                <div className="project-badge" style={{ backgroundColor: project.color }} />
                {projectEditingId === project.id ? (
                  <div className="project-editing">
                    <input
                      value={projectDraftName}
                      onChange={(event) => setProjectDraftName(event.target.value)}
                      placeholder="Project 名稱"
                    />
                    <input
                      value={projectDraftDesc}
                      onChange={(event) => setProjectDraftDesc(event.target.value)}
                      placeholder="Project 說明"
                    />
                    <div className="row-actions">
                      <button type="button" onClick={() => setProjectEditingId(null)}>
                        取消
                      </button>
                      <button type="button" className="primary" onClick={saveProjectEdit}>
                        儲存
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="project-content">
                      <div className="project-title">{project.name}</div>
                      {project.description && <div className="project-desc">{project.description}</div>}
                      <div className="project-meta">{projectUsage.get(project.id) ?? 0} 個項目</div>
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => startProjectEdit(project)}>
                        編輯
                      </button>
                      <button type="button" className="danger" onClick={() => void deleteProject(project.id)}>
                        刪除
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {projects.length === 0 && <div className="empty">尚未建立任何 Project</div>}
          </ul>
        </section>
      )}
    </div>
  );
}
