"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { useCanvasStore, AppNode } from "@/store/canvas-store";
import { useCallback, useState } from "react";
import NodeShell from "./NodeShell";

export default function GeneratorNode({
  id,
  data,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<AppNode>) {
  const { updateNodeData, removeNode, getConnectedInputs, addNode, addNodeAndConnect } =
    useCanvasStore();
  const [error, setError] = useState<string | null>(null);

  const model = data.model || "nano-banana";
  const aspectRatio = data.aspectRatio || "16x9";
  const renderingSpeed = data.renderingSpeed || "DEFAULT";
  const ideogramMode = data.ideogramMode || "generate";

  const modelLabel =
    model === "nano-banana"
      ? "Gemini 3.1 Flash (Nano Banana 2)"
      : "Ideogram v3";

  const modelIcon =
    model === "nano-banana" ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" strokeWidth="0">
        <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BB68FF" strokeWidth="1.5">
        <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

  const handleGenerate = useCallback(async () => {
    setError(null);
    updateNodeData(id, { isGenerating: true });

    const inputs = getConnectedInputs(id);

    // Helper: get a usable image from a node — prefer base64, convert URL on the fly if needed
    const getImage = async (n: { data: { imageBase64?: string; imageUrl?: string } }): Promise<string | null> => {
      if (n.data.imageBase64) return n.data.imageBase64;
      if (n.data.imageUrl) {
        try {
          const res = await fetch(n.data.imageUrl);
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch { return null; }
      }
      return null;
    };

    const faceImages = (await Promise.all(inputs.faceRefs.map(getImage))).filter(Boolean) as string[];
    const swipeImages = (await Promise.all(inputs.swipeRefs.map(getImage))).filter(Boolean) as string[];
    const promptText = inputs.prompts
      .map((n) => n.data.prompt)
      .filter(Boolean)
      .join("\n");
    const negativePrompt = inputs.prompts
      .map((n) => n.data.negativePrompt)
      .filter(Boolean)
      .join("\n");

    const previewImages = inputs.images
      .filter((n) => n.type === "preview")
      .map((n) => {
        const imgs = n.data.generatedImages;
        const idx = n.data.selectedImageIndex || 0;
        return imgs?.[idx];
      })
      .filter(Boolean) as string[];

    const allRefImages = [...swipeImages, ...previewImages];

    try {
      let endpoint: string;
      let body: Record<string, unknown>;

      if (model === "nano-banana") {
        endpoint = "/api/generate/nano-banana";
        body = {
          prompt: promptText,
          negativePrompt,
          faceImages,
          referenceImages: allRefImages,
          aspectRatio,
        };
      } else {
        if (ideogramMode === "remix" && allRefImages.length > 0) {
          endpoint = "/api/remix/ideogram";
          body = {
            prompt: promptText,
            negativePrompt,
            image: allRefImages[0],
            imageWeight: data.imageWeight ?? 50,
            characterReferenceImage: faceImages[0] || null,
            styleReferenceImages: allRefImages.slice(1),
            aspectRatio,
            renderingSpeed,
            styleType: data.styleType || "GENERAL",
          };
        } else if (ideogramMode === "edit" && allRefImages.length > 0) {
          endpoint = "/api/edit/ideogram";
          body = {
            prompt: promptText,
            image: allRefImages[0],
            mask: data.maskDataUrl || null,
            characterReferenceImage: faceImages[0] || null,
            renderingSpeed,
            styleType: data.styleType || "GENERAL",
          };
        } else {
          endpoint = "/api/generate/ideogram";
          body = {
            prompt: promptText,
            negativePrompt,
            characterReferenceImage: faceImages[0] || null,
            styleReferenceImages: allRefImages,
            aspectRatio,
            renderingSpeed,
            styleType: data.styleType || "GENERAL",
          };
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed (${res.status})`);
      }

      const result = await res.json();
      const images: string[] = result.images || [];

      updateNodeData(id, {
        isGenerating: false,
        generatedImages: images,
        selectedImageIndex: 0,
      });

      if (images.length > 0) {
        addNode(
          "preview",
          { x: positionAbsoluteX + 520, y: positionAbsoluteY },
          {
            generatedImages: images,
            selectedImageIndex: 0,
            label: `Output - ${modelLabel}`,
          }
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      updateNodeData(id, { isGenerating: false });
    }
  }, [
    id,
    model,
    modelLabel,
    aspectRatio,
    renderingSpeed,
    ideogramMode,
    data.imageWeight,
    data.maskDataUrl,
    data.styleType,
    updateNodeData,
    getConnectedInputs,
    addNode,
    addNodeAndConnect,
    positionAbsoluteX,
    positionAbsoluteY,
  ]);

  const selectStyle = {
    background: "var(--surface)",
    color: "var(--text-secondary)",
    border: "1px solid transparent",
  };

  return (
    <NodeShell
      title={modelLabel}
      icon={modelIcon}
      onDelete={() => removeNode(id)}
      width={460}
    >
      {/* Prompt handle */}
      <Handle type="target" position={Position.Left} id="prompt-in" style={{ top: "10%" }} />
      <button
        className="absolute nopan nodrag text-xs cursor-pointer transition-colors"
        style={{
          left: -8,
          top: "10%",
          transform: "translateX(-100%) translateY(-50%)",
          color: "#BB68FF",
          background: "none",
          border: "none",
          padding: "2px 4px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        onClick={() => {
          addNodeAndConnect(
            "prompt",
            { x: positionAbsoluteX - 520, y: positionAbsoluteY - 100 },
            id,
            "prompt-in",
            "prompt"
          );
        }}
        title="Click to add a prompt node"
      >
        Prompt
      </button>

      {/* Face handle */}
      <Handle type="target" position={Position.Left} id="face-in" style={{ top: "18%" }} />
      <button
        className="absolute nopan nodrag text-xs cursor-pointer transition-colors"
        style={{
          left: -8,
          top: "18%",
          transform: "translateX(-100%) translateY(-50%)",
          color: "#EF9092",
          background: "none",
          border: "none",
          padding: "2px 4px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        onClick={() => {
          addNodeAndConnect(
            "faceReference",
            { x: positionAbsoluteX - 520, y: positionAbsoluteY + 50 },
            id,
            "face-in",
            "face"
          );
        }}
        title="Click to add a face reference"
      >
        Face
      </button>

      {/* Reference thumbnail handle */}
      <Handle type="target" position={Position.Left} id="image-in" style={{ top: "26%" }} />
      <button
        className="absolute nopan nodrag text-xs cursor-pointer transition-colors"
        style={{
          left: -8,
          top: "26%",
          transform: "translateX(-100%) translateY(-50%)",
          color: "var(--accent)",
          background: "none",
          border: "none",
          padding: "2px 4px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        onClick={() => {
          addNodeAndConnect(
            "swipeFile",
            { x: positionAbsoluteX - 520, y: positionAbsoluteY + 200 },
            id,
            "image-in",
            "image"
          );
        }}
        title="Click to add a reference thumbnail"
      >
        Reference
      </button>

      {/* Generated image preview */}
      {data.generatedImages && data.generatedImages.length > 0 && (
        <div className="mb-4 rounded-xl overflow-hidden">
          <img
            src={data.generatedImages[data.selectedImageIndex || 0]}
            alt="Generated"
            className="w-full"
          />
        </div>
      )}

      {/* Settings */}
      <div className="space-y-3">
        <div>
          <label className="text-xs block mb-1.5" style={{ color: "var(--text-muted)" }}>
            Model
          </label>
          <select
            value={model}
            onChange={(e) =>
              updateNodeData(id, {
                model: e.target.value as "nano-banana" | "ideogram",
              })
            }
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none nopan nodrag"
            style={selectStyle}
          >
            <option value="nano-banana">Nano Banana Pro 2</option>
            <option value="ideogram">Ideogram v3</option>
          </select>
        </div>

        {model === "ideogram" && (
          <div>
            <label className="text-xs block mb-1.5" style={{ color: "var(--text-muted)" }}>
              Mode
            </label>
            <select
              value={ideogramMode}
              onChange={(e) =>
                updateNodeData(id, {
                  ideogramMode: e.target.value as "generate" | "remix" | "edit",
                })
              }
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none nopan nodrag"
              style={selectStyle}
            >
              <option value="generate">Generate</option>
              <option value="remix">Remix</option>
              <option value="edit">Edit (Inpaint)</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-xs block mb-1.5" style={{ color: "var(--text-muted)" }}>
            Aspect Ratio
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none nopan nodrag"
            style={selectStyle}
          >
            <option value="16x9">16:9 (Thumbnail)</option>
            <option value="1x1">1:1 (Square)</option>
            <option value="4x3">4:3</option>
            <option value="3x2">3:2</option>
            <option value="9x16">9:16 (Vertical)</option>
          </select>
        </div>

        {model === "ideogram" && (
          <>
            <div>
              <label className="text-xs block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Speed
              </label>
              <select
                value={renderingSpeed}
                onChange={(e) =>
                  updateNodeData(id, { renderingSpeed: e.target.value })
                }
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none nopan nodrag"
                style={selectStyle}
              >
                <option value="TURBO">Turbo</option>
                <option value="DEFAULT">Default</option>
                <option value="QUALITY">Quality</option>
              </select>
            </div>

            <div>
              <label className="text-xs block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Style
              </label>
              <select
                value={data.styleType || "GENERAL"}
                onChange={(e) =>
                  updateNodeData(id, { styleType: e.target.value })
                }
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none nopan nodrag"
                style={selectStyle}
              >
                <option value="AUTO">Auto</option>
                <option value="GENERAL">General</option>
                <option value="REALISTIC">Realistic</option>
                <option value="DESIGN">Design</option>
                <option value="FICTION">Fiction</option>
              </select>
            </div>

            {ideogramMode === "remix" && (
              <div>
                <label className="text-xs block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Image Weight: {data.imageWeight ?? 50}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={data.imageWeight ?? 50}
                  onChange={(e) =>
                    updateNodeData(id, { imageWeight: Number(e.target.value) })
                  }
                  className="w-full nopan nodrag"
                  style={{ accentColor: "var(--accent)" }}
                />
              </div>
            )}
          </>
        )}

        {/* Add another image input link */}
        <button
          className="text-xs transition-colors nopan nodrag"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-secondary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }
          onClick={() => {
            addNodeAndConnect(
              "swipeFile",
              { x: positionAbsoluteX - 520, y: positionAbsoluteY + 350 },
              id,
              "image-in",
              "image"
            );
          }}
        >
          + Add another image input
        </button>

        {/* Generate button - Weavy style */}
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={data.isGenerating}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background: "var(--accent-yellow)",
              color: "var(--canvas-bg)",
            }}
          >
            {data.isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <span>&rarr;</span> Run Model
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs" style={{ color: "#EF9092" }}>
            {error}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="result" />
      <span
        className="absolute text-xs pointer-events-none"
        style={{
          right: -8,
          top: "15%",
          transform: "translateX(100%) translateY(-50%)",
          color: "var(--accent)",
        }}
      >
        Result
      </span>
    </NodeShell>
  );
}
