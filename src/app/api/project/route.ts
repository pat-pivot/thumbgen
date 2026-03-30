import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";

// GET /api/project?id=default — load project state
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("id") || "default";

    const nodes = await d1Query(
      "SELECT id, type, position_x, position_y, data FROM nodes WHERE project_id = ?",
      [projectId]
    );

    const edges = await d1Query(
      "SELECT id, source, target, source_handle, target_handle, edge_type FROM edges WHERE project_id = ?",
      [projectId]
    );

    const flowNodes = nodes.map((n: Record<string, unknown>) => ({
      id: n.id as string,
      type: n.type as string,
      position: { x: n.position_x as number, y: n.position_y as number },
      data: JSON.parse((n.data as string) || "{}"),
    }));

    const flowEdges = edges.map((e: Record<string, unknown>) => ({
      id: e.id as string,
      source: e.source as string,
      target: e.target as string,
      sourceHandle: e.source_handle as string | null,
      targetHandle: e.target_handle as string | null,
      type: (e.edge_type as string) || "custom",
    }));

    return NextResponse.json({ nodes: flowNodes, edges: flowEdges });
  } catch (err) {
    console.error("Load project error:", err);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}

// POST /api/project — save project state
export async function POST(request: NextRequest) {
  try {
    const { projectId = "default", nodes, edges } = await request.json();

    // Clear existing nodes and edges
    await d1Query("DELETE FROM nodes WHERE project_id = ?", [projectId]);
    await d1Query("DELETE FROM edges WHERE project_id = ?", [projectId]);

    // Insert nodes
    for (const node of nodes) {
      const data = JSON.stringify(node.data || {});
      await d1Query(
        "INSERT INTO nodes (id, project_id, type, position_x, position_y, data) VALUES (?, ?, ?, ?, ?, ?)",
        [node.id, projectId, node.type, node.position.x, node.position.y, data]
      );
    }

    // Insert edges
    for (const edge of edges) {
      await d1Query(
        "INSERT INTO edges (id, project_id, source, target, source_handle, target_handle, edge_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          edge.id,
          projectId,
          edge.source,
          edge.target,
          edge.sourceHandle || null,
          edge.targetHandle || null,
          edge.type || "custom",
        ]
      );
    }

    // Update project timestamp
    await d1Query(
      "UPDATE projects SET updated_at = datetime('now') WHERE id = ?",
      [projectId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save project error:", err);
    return NextResponse.json({ error: "Failed to save project" }, { status: 500 });
  }
}
