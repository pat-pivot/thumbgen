"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { useCanvasStore, AppNode } from "@/store/canvas-store";
import NodeShell from "./NodeShell";

export default function PreviewNode({ id, data }: NodeProps<AppNode>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);

  const images = data.generatedImages || [];
  const selectedIndex = data.selectedImageIndex || 0;
  const currentImage = images[selectedIndex];

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `thumbnail-${Date.now()}.png`;
    link.click();
  };

  return (
    <NodeShell
      title={data.label || "Preview"}
      onDelete={() => removeNode(id)}
      width={460}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BB68FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      }
    >
      <Handle type="target" position={Position.Left} id="preview-in" />

      {currentImage ? (
        <>
          <div className="rounded-xl overflow-hidden">
            <img
              src={currentImage}
              alt="Generated thumbnail"
              className="w-full"
            />
          </div>
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => updateNodeData(id, { selectedImageIndex: i })}
                  className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background:
                      i === selectedIndex
                        ? "var(--accent)"
                        : "var(--surface)",
                    color:
                      i === selectedIndex
                        ? "var(--canvas-bg)"
                        : "var(--text-secondary)",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleDownload}
            className="w-full mt-3 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{
              background: "var(--surface)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--node-bg-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--surface)")
            }
          >
            Download
          </button>
        </>
      ) : (
        <div
          className="w-full h-48 rounded-xl flex items-center justify-center"
          style={{ background: "var(--surface)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            No image yet
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="preview-out" />
    </NodeShell>
  );
}
