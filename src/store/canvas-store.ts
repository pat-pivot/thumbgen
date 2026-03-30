import { create } from "zustand";
import {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import { v4 as uuid } from "uuid";

export type NodeData = {
  label?: string;
  imageUrl?: string;
  imageBase64?: string;
  imageR2Key?: string;
  prompt?: string;
  negativePrompt?: string;
  model?: "nano-banana" | "ideogram";
  ideogramMode?: "generate" | "remix" | "edit";
  aspectRatio?: string;
  imageWeight?: number;
  styleType?: string;
  renderingSpeed?: string;
  isGenerating?: boolean;
  generatedImages?: string[];
  generatedImageKeys?: string[];
  selectedImageIndex?: number;
  maskDataUrl?: string;
};

export type AppNode = Node<NodeData>;

type Snapshot = { nodes: AppNode[]; edges: Edge[] };

interface CanvasState {
  nodes: AppNode[];
  edges: Edge[];
  loaded: boolean;
  saving: boolean;
  history: Snapshot[];
  historyIndex: number;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: string, position: { x: number; y: number }, data?: NodeData) => string;
  addNodeAndConnect: (
    type: string,
    position: { x: number; y: number },
    connectTo: string,
    connectToHandle: string,
    newNodeHandle?: string,
    data?: NodeData,
    newNodeIsTarget?: boolean,
  ) => string;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  removeNode: (nodeId: string) => void;
  getConnectedInputs: (nodeId: string) => {
    faceRefs: AppNode[];
    swipeRefs: AppNode[];
    prompts: AppNode[];
    images: AppNode[];
  };
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  loadProject: (projectId?: string) => Promise<void>;
  saveProject: (projectId?: string) => Promise<void>;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(state: CanvasState) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    state.saveProject();
  }, 2000);
}

const MAX_HISTORY = 50;

let historyTimeout: ReturnType<typeof setTimeout> | null = null;

function pushHistory(get: () => CanvasState, set: (s: Partial<CanvasState>) => void) {
  // Debounce history snapshots so rapid changes (e.g. dragging) collapse into one
  if (historyTimeout) clearTimeout(historyTimeout);
  historyTimeout = setTimeout(() => {
    const { nodes, edges, history, historyIndex } = get();
    const newSnapshot: Snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    // Discard any forward history after current index
    const newHistory = [...history.slice(0, historyIndex + 1), newSnapshot].slice(-MAX_HISTORY);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  }, 300);
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  loaded: false,
  saving: false,
  history: [],
  historyIndex: -1,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
    if (get().loaded) {
      pushHistory(get, set);
      debouncedSave(get());
    }
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    if (get().loaded) {
      pushHistory(get, set);
      debouncedSave(get());
    }
  },

  onConnect: (connection) => {
    set({
      edges: addEdge({ ...connection, type: "custom" }, get().edges),
    });
    if (get().loaded) {
      pushHistory(get, set);
      debouncedSave(get());
    }
  },

  addNode: (type, position, data = {}) => {
    const id = uuid();
    const newNode: AppNode = { id, type, position, data: { ...data } };
    set({ nodes: [...get().nodes, newNode] });
    if (get().loaded) {
      pushHistory(get, set);
      debouncedSave(get());
    }
    return id;
  },

  addNodeAndConnect: (type, position, connectTo, connectToHandle, newNodeHandle, data = {}, newNodeIsTarget = false) => {
    const id = uuid();
    const newNode: AppNode = { id, type, position, data: { ...data } };
    const newEdge: Edge = newNodeIsTarget
      ? {
          id: uuid(),
          source: connectTo,
          sourceHandle: connectToHandle || null,
          target: id,
          targetHandle: newNodeHandle || null,
          type: "custom",
        }
      : {
          id: uuid(),
          source: id,
          sourceHandle: newNodeHandle || null,
          target: connectTo,
          targetHandle: connectToHandle || null,
          type: "custom",
        };
    set({
      nodes: [...get().nodes, newNode],
      edges: [...get().edges, newEdge],
    });
    if (get().loaded) {
      pushHistory(get, set);
      debouncedSave(get());
    }
    return id;
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
    if (get().loaded) {
      pushHistory(get, set);
      debouncedSave(get());
    }
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
    if (get().loaded) {
      pushHistory(get, set);
      debouncedSave(get());
    }
  },

  getConnectedInputs: (nodeId) => {
    const { nodes, edges } = get();
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const sourceIds = incomingEdges.map((e) => e.source);
    const sourceNodes = nodes.filter((n) => sourceIds.includes(n.id));

    return {
      faceRefs: sourceNodes.filter((n) => n.type === "faceReference"),
      swipeRefs: sourceNodes.filter((n) => n.type === "swipeFile"),
      prompts: sourceNodes.filter((n) => n.type === "prompt"),
      images: sourceNodes.filter(
        (n) => n.type === "preview" || n.type === "swipeFile" || n.type === "faceReference"
      ),
    };
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    set({
      nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
      edges: JSON.parse(JSON.stringify(snapshot.edges)),
      historyIndex: newIndex,
    });
    debouncedSave(get());
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    set({
      nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
      edges: JSON.parse(JSON.stringify(snapshot.edges)),
      historyIndex: newIndex,
    });
    debouncedSave(get());
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  loadProject: async (projectId = "default") => {
    try {
      const res = await fetch(`/api/project?id=${projectId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const initialNodes = data.nodes || [];
      const initialEdges = data.edges || [];
      const initialSnapshot: Snapshot = {
        nodes: JSON.parse(JSON.stringify(initialNodes)),
        edges: JSON.parse(JSON.stringify(initialEdges)),
      };
      set({
        nodes: initialNodes,
        edges: initialEdges,
        loaded: true,
        history: [initialSnapshot],
        historyIndex: 0,
      });
    } catch (err) {
      console.error("Failed to load project:", err);
      set({ loaded: true, history: [{ nodes: [], edges: [] }], historyIndex: 0 });
    }
  },

  saveProject: async (projectId = "default") => {
    const { nodes, edges, saving } = get();
    if (saving) return;

    set({ saving: true });
    try {
      // Strip large base64 data before saving to D1 — images should be in R2
      const cleanNodes = nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          ...n.data,
          // Keep base64 for now if no R2 key exists (we'll migrate later)
          // Remove transient state
          isGenerating: undefined,
        },
      }));

      await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, nodes: cleanNodes, edges }),
      });
    } catch (err) {
      console.error("Failed to save project:", err);
    } finally {
      set({ saving: false });
    }
  },
}));
