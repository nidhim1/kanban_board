import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
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
  // Track which card is being dragged and which column it's over
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  // ============================================
  // Sensor configuration
  // ============================================
  // PointerSensor with a 5px activation distance means you need to move the mouse 5px before a drag starts. This prevents accidental drags when clicking a card to open the detail panel.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // ============================================
  // Group tasks by column and sort by position
  // ============================================
  // useMemo avoids recalculating on every render - only recalculates when the tasks array actually changes.
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

    // Sort each column by position (0 = top of column)
    for (const key of Object.keys(map) as TaskStatus[]) {
      map[key].sort((a, b) => a.position - b.position);
    }

    return map;
  }, [tasks]);

  // The card currently being dragged (for the DragOverlay ghost)
  const activeTask = activeId
    ? tasks.find((t) => t.id === activeId)
    : null;

  // ============================================
  // Helper: find which column an ID belongs to
  // ============================================
  // The ID could be a column ID ("todo") or a task UUID.
  function findColumn(id: string): TaskStatus | null {
    if (["todo", "in_progress", "in_review", "done"].includes(id)) {
      return id as TaskStatus;
    }
    const task = tasks.find((t) => t.id === id);
    return task?.status || null;
  }

  // ============================================
  // Drag event handlers
  // ============================================

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  // Fires continuously as the dragged card moves over different targets
  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverColumn(null);
      return;
    }
    setOverColumn(findColumn(over.id as string));
  }

  // Fires when the card is dropped
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

    // Build the new order for the target column
    const targetTasks = tasksByColumn[overCol].filter(
      (t) => t.id !== activeTaskId
    );

    // If dropped on another task, insert before it
    const overTaskIndex = targetTasks.findIndex(
      (t) => t.id === (over.id as string)
    );
    if (overTaskIndex >= 0) {
      targetTasks.splice(overTaskIndex, 0, draggedTask);
    } else {
      // Dropped on the column itself — add at the end
      targetTasks.push(draggedTask);
    }

    // Build the reorder payload with new positions
    const reorderItems = targetTasks.map((t, i) => ({
      id: t.id,
      status: overCol,
      position: i,
    }));

    // If the card moved to a different column, also reorder the source column to close the gap
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
    <div className="px-4 py-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Four-column grid */}
        <div className="grid grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const columnTasks = tasksByColumn[col.id];
            return (
              // SortableContext tells dnd-kit which items are in this column
              <SortableContext
                key={col.id}
                items={columnTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <Column
                  column={col}
                  tasks={columnTasks}
                  isDark={isDark}
                  isOver={overColumn === col.id}
                  onOpenCreate={() => onOpenCreate(col.id)}
                  onSelectTask={onSelectTask}
                />
              </SortableContext>
            );
          })}
        </div>

        {/* ============================================
            DragOverlay — the ghost card that follows the cursor
            ============================================
            This renders outside the normal DOM flow so it can float freely. The original card fades (opacity: 0.4) while this overlay shows the card at the cursor position. */}
        <DragOverlay>
          {activeTask ? (
            <div className="drag-overlay">
              <TaskCard
                task={activeTask}
                isDark={isDark}
                isOverlay
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}