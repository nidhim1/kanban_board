import { useSortable } from "@dnd-kit/sortable";

// An invisible sortable item placed at the end of each column.
// This gives dnd-kit a drop target after the last card, solving the "can't drop at the bottom" problem.
// This is the standard approach from dnd-kit documentation.
interface DropZoneProps {
  id: string;
}

export function DropZone({ id }: DropZoneProps) {
  const { setNodeRef } = useSortable({ id });

  return (
    <div ref={setNodeRef} className="h-2 w-full" />
  );
}