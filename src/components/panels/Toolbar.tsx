"use client";

import { useCanvasStore } from "@/store/canvas-store";
import { useReactFlow } from "@xyflow/react";

export default function Toolbar() {
  const addNode = useCanvasStore((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();

  const addAtCenter = (type: string) => {
    const pos = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    // Offset randomly so nodes don't stack
    pos.x += (Math.random() - 0.5) * 100;
    pos.y += (Math.random() - 0.5) * 100;
    addNode(type, pos);
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-xl px-4 py-2 shadow-2xl">
      <span className="text-sm font-semibold text-zinc-300 mr-2">ThumbGen</span>
      <div className="w-px h-5 bg-zinc-700" />

      <ToolbarButton
        label="Face"
        color="pink"
        onClick={() => addAtCenter("faceReference")}
      />
      <ToolbarButton
        label="Swipe"
        color="orange"
        onClick={() => addAtCenter("swipeFile")}
      />
      <ToolbarButton
        label="Prompt"
        color="blue"
        onClick={() => addAtCenter("prompt")}
      />
      <ToolbarButton
        label="Generate"
        color="green"
        onClick={() => addAtCenter("generator")}
      />
      <ToolbarButton
        label="Preview"
        color="purple"
        onClick={() => addAtCenter("preview")}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  const dotColor =
    color === "pink"
      ? "bg-pink-500"
      : color === "orange"
      ? "bg-orange-500"
      : color === "blue"
      ? "bg-blue-500"
      : color === "green"
      ? "bg-green-500"
      : "bg-purple-500";

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {label}
    </button>
  );
}
