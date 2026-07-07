import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { COLUMNS } from "../types";
import type { Task, TaskStatus } from "../types";

interface BoardProps {
  tasks: Task[];
  isDark: boolean;
  onOpenCreate: (status: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onReorder: (
    items: { id: string; status: string; position: number }[]
  ) => void;
}

export function Board({
  tasks,
  isDark,
  onOpenCreate,
  onSelectTask,
  onReorder,
}: BoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  // Support both mouse and touch for mobile drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };

    for (const task of tasks) {
      map[task.status]?.push(task);
    }

    for (const key of Object.keys(map) as TaskStatus[]) {
      map[key].sort((a, b) => a.position - b.position);
    }

    return map;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  function findColumn(id: string): TaskStatus | null {
    if (["todo", "in_progress", "in_review", "done"].includes(id)) {
      return id as TaskStatus;
    }
    // Check for end-of-column drop zones
    const endMatch = String(id).match(/^(.+)-end$/);
    if (endMatch && ["todo", "in_progress", "in_review", "done"].includes(endMatch[1])) {
      return endMatch[1] as TaskStatus;
    }
    const task = tasks.find((t) => t.id === id);
    return task?.status || null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverColumn(null);
      return;
    }
    setOverColumn(findColumn(over.id as string));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overCol = findColumn(over.id as string);
    if (!overCol) return;

    const draggedTask = tasks.find((t) => t.id === activeTaskId);
    if (!draggedTask) return;

    const targetTasks = tasksByColumn[overCol].filter(
      (t) => t.id !== activeTaskId
    );

    const overTaskIndex = targetTasks.findIndex(
      (t) => t.id === (over.id as string)
    );
    if (overTaskIndex >= 0) {
      targetTasks.splice(overTaskIndex, 0, draggedTask);
    } else {
      targetTasks.push(draggedTask);
    }

    const reorderItems = targetTasks.map((t, i) => ({
      id: t.id,
      status: overCol,
      position: i,
    }));

    if (draggedTask.status !== overCol) {
      const sourceTasks = tasksByColumn[draggedTask.status].filter(
        (t) => t.id !== activeTaskId
      );
      const sourceItems = sourceTasks.map((t, i) => ({
        id: t.id,
        status: draggedTask.status,
        position: i,
      }));
      onReorder([...reorderItems, ...sourceItems]);
    } else {
      onReorder(reorderItems);
    }
  }

  return (
    <div className="p-3 sm:p-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* 
          Responsive grid:
          - Mobile: horizontal scroll with fixed-width columns
          - Tablet (sm): 2 columns grid
          - Desktop (lg): 4 columns grid
        */}
        <div className="
          grid grid-cols-1 gap-3
          sm:grid-cols-2
          lg:grid-cols-4
        ">
          {COLUMNS.map((col) => {
            const columnTasks = tasksByColumn[col.id];
            return (
              <div key={col.id}>
                <SortableContext
                  items={[...columnTasks.map((t) => t.id), `${col.id}-end`]}
                  strategy={verticalListSortingStrategy}
                >
                  <Column
                    column={col}
                    tasks={columnTasks}
                    totalTasks={tasks.length}
                    isDark={isDark}
                    isOver={overColumn === col.id}
                    onOpenCreate={() => onOpenCreate(col.id)}
                    onSelectTask={onSelectTask}
                  />
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="drag-overlay">
              <TaskCard
                task={activeTask}
                isDark={isDark}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
