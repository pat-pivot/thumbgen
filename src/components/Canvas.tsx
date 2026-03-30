"use client";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvasStore } from "@/store/canvas-store";
import FaceReferenceNode from "./nodes/FaceReferenceNode";
import SwipeFileNode from "./nodes/SwipeFileNode";
import PromptNode from "./nodes/PromptNode";
import GeneratorNode from "./nodes/GeneratorNode";
import PreviewNode from "./nodes/PreviewNode";
import CustomEdge from "./edges/CustomEdge";
import Sidebar from "./panels/Sidebar";
import ZoomBar from "./panels/ZoomBar";
import ContextMenu from "./panels/ContextMenu";
import { useCallback, useState, useEffect, useRef } from "react";
import { DragEvent } from "react";
import { useReactFlow, OnConnectStart } from "@xyflow/react";

const nodeTypes = {
  faceReference: FaceReferenceNode,
  swipeFile: SwipeFileNode,
  prompt: PromptNode,
  generator: GeneratorNode,
  preview: PreviewNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const defaultEdgeOptions = {
  type: "custom",
  animated: false,
};

function CanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, addNodeAndConnect, loadProject, saving } =
    useCanvasStore();
  const { screenToFlowPosition } = useReactFlow();

  // Load project on mount
  useEffect(() => {
    loadProject();
  }, [loadProject]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPos: { x: number; y: number };
  } | null>(null);

  // Edge drop menu state
  const [edgeDropMenu, setEdgeDropMenu] = useState<{
    x: number;
    y: number;
    flowPos: { x: number; y: number };
    sourceNodeId: string;
    sourceHandleId: string;
  } | null>(null);
  const connectStartRef = useRef<{ nodeId: string; handleId: string; handleType: string } | null>(null);
  const justOpenedEdgeMenuRef = useRef(false);

  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    connectStartRef.current = {
      nodeId: params.nodeId || "",
      handleId: params.handleId || "",
      handleType: params.handleType || "source",
    };
  }, []);

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      // If dropped on a handle, a real connection was made — don't show menu
      if (target.closest(".react-flow__handle")) return;
      if (!connectStartRef.current?.nodeId) return;

      const clientX = "clientX" in event ? event.clientX : event.changedTouches[0].clientX;
      const clientY = "clientY" in event ? event.clientY : event.changedTouches[0].clientY;

      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });

      // Flag to prevent onPaneClick from immediately clearing the menu
      justOpenedEdgeMenuRef.current = true;
      setTimeout(() => { justOpenedEdgeMenuRef.current = false; }, 100);

      setEdgeDropMenu({
        x: clientX,
        y: clientY,
        flowPos,
        sourceNodeId: connectStartRef.current.nodeId,
        sourceHandleId: connectStartRef.current.handleId,
      });
    },
    [screenToFlowPosition]
  );

  const addConnectedNode = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      if (!edgeDropMenu) return;
      const draggedFromSource = connectStartRef.current?.handleType === "source";
      const sourceHandleId = edgeDropMenu.sourceHandleId;

      // Determine which handle on the NEW node to connect to
      let newNodeHandle: string | undefined;
      if (draggedFromSource) {
        // Dragged from a source handle → new node is the target
        if (type === "generator") {
          // If source is an image handle, connect to image-in; otherwise prompt-in
          const isFaceHandle = sourceHandleId === "face";
          const isImageHandle = ["image", "face", "preview-out", "result"].includes(sourceHandleId);
          newNodeHandle = isFaceHandle ? "face-in" : isImageHandle ? "image-in" : "prompt-in";
        } else if (type === "preview") {
          newNodeHandle = "preview-in";
        }
      } else {
        // Dragged from a target handle → new node is the source
        if (type === "prompt") newNodeHandle = undefined; // prompt nodes use default
        else if (type === "swipeFile") newNodeHandle = "image";
        else if (type === "faceReference") newNodeHandle = "face";
      }

      addNodeAndConnect(
        type,
        edgeDropMenu.flowPos,
        edgeDropMenu.sourceNodeId,
        sourceHandleId,
        newNodeHandle,
        data,
        draggedFromSource,
      );
      setEdgeDropMenu(null);
    },
    [edgeDropMenu, addNodeAndConnect]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow-type");
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const rawData = event.dataTransfer.getData("application/reactflow-data");
      const data = rawData ? JSON.parse(rawData) : {};

      addNode(type, position, data);
    },
    [screenToFlowPosition, addNode]
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const clientX = "clientX" in event ? event.clientX : 0;
      const clientY = "clientY" in event ? event.clientY : 0;
      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
      setContextMenu({
        x: clientX,
        y: clientY,
        flowPos,
      });
    },
    [screenToFlowPosition]
  );

  const contextMenuItems = contextMenu
    ? [
        {
          label: "Text Prompt",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          ),
          onClick: () => addNode("prompt", contextMenu.flowPos),
        },
        {
          label: "Nano Banana 2",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" strokeWidth="0">
              <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
            </svg>
          ),
          onClick: () =>
            addNode("generator", contextMenu.flowPos, {
              model: "nano-banana",
            }),
        },
        {
          label: "Ideogram v3",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BB68FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
            </svg>
          ),
          onClick: () =>
            addNode("generator", contextMenu.flowPos, {
              model: "ideogram",
            }),
        },
      ]
    : [];

  return (
    <div className="w-full h-screen" style={{ background: "var(--canvas-bg)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={() => {
          setContextMenu(null);
          if (!justOpenedEdgeMenuRef.current) {
            setEdgeDropMenu(null);
          }
        }}
        fitView={false}
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.02}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: "var(--canvas-bg)" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={0.8}
          color="#65616b"
        />

        {/* Project title + save indicator */}
        <Panel position="top-left" className="!ml-16">
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: "var(--node-bg)",
              color: "var(--text-secondary)",
              border: "1px solid var(--surface)",
            }}
          >
            ThumbGen
            {saving && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Saving...
              </span>
            )}
          </div>
        </Panel>

        <Sidebar />
        <ZoomBar />
      </ReactFlow>

      {/* Right-click context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Edge drop menu — appears when dragging a connection to empty space */}
      {edgeDropMenu && (
        <ContextMenu
          x={edgeDropMenu.x}
          y={edgeDropMenu.y}
          items={[
            {
              label: "Text Prompt",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              ),
              onClick: () => addConnectedNode("prompt"),
            },
            {
              label: "Nano Banana 2",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" strokeWidth="0">
                  <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
                </svg>
              ),
              onClick: () => addConnectedNode("generator", { model: "nano-banana" }),
            },
            {
              label: "Ideogram v3",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BB68FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
                </svg>
              ),
              onClick: () => addConnectedNode("generator", { model: "ideogram" }),
            },
          ]}
          onClose={() => setEdgeDropMenu(null)}
        />
      )}
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
