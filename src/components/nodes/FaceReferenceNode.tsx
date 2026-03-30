"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { useCanvasStore, AppNode } from "@/store/canvas-store";
import { useCallback, useRef, useEffect } from "react";
import NodeShell from "./NodeShell";

export default function FaceReferenceNode({ id, data }: NodeProps<AppNode>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-convert URL images to base64 so the generator pipeline works
  useEffect(() => {
    if (data.imageUrl && !data.imageBase64) {
      fetch(data.imageUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            updateNodeData(id, { imageBase64: reader.result as string });
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {});
    }
  }, [data.imageUrl, data.imageBase64, id, updateNodeData]);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        updateNodeData(id, {
          imageBase64: reader.result as string,
          label: file.name,
        });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  return (
    <NodeShell
      title="File"
      onDelete={() => removeNode(id)}
      width={460}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F1A0FA" strokeWidth="2" strokeLinecap="round">
          <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
        </svg>
      }
    >
      {(data.imageBase64 || data.imageUrl) ? (
        <div className="relative group rounded-xl overflow-hidden">
          <img
            src={data.imageBase64 || data.imageUrl}
            alt="Face reference"
            className="w-full object-cover"
            style={{ maxHeight: 400 }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm rounded-xl"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors nopan nodrag"
          style={{
            borderColor: "var(--surface)",
            color: "var(--text-muted)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#F1A0FA")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--surface)")}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
          </svg>
          <span className="text-xs">Upload face reference</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {(data.imageBase64 || data.imageUrl) && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full mt-3 text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          + Add more images
        </button>
      )}
      <Handle type="source" position={Position.Right} id="face" />
    </NodeShell>
  );
}
