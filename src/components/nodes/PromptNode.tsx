"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { useCanvasStore, AppNode } from "@/store/canvas-store";
import NodeShell from "./NodeShell";

export default function PromptNode({ id, data }: NodeProps<AppNode>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);

  return (
    <NodeShell title="Prompt" onDelete={() => removeNode(id)} width={460}>
      <div className="space-y-2">
        <textarea
          value={data.prompt || ""}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
          placeholder="Describe your thumbnail..."
          className="w-full h-28 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none nopan nodrag"
          style={{
            background: "var(--surface)",
            color: "var(--text-primary)",
            border: "1px solid transparent",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
        />
        <textarea
          value={data.negativePrompt || ""}
          onChange={(e) => updateNodeData(id, { negativePrompt: e.target.value })}
          placeholder="Negative prompt (optional)..."
          className="w-full h-16 rounded-xl px-4 py-3 text-xs resize-none focus:outline-none nopan nodrag"
          style={{
            background: "var(--surface)",
            color: "var(--text-tertiary)",
            border: "1px solid transparent",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="prompt"
      />
      <div className="handle-label handle-label-right" style={{ top: "50%", right: -8, transform: "translateX(100%) translateY(-50%)" }}>
        <span style={{ color: "var(--accent)", fontSize: 10 }}>Prompt</span>
      </div>
    </NodeShell>
  );
}
