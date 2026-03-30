"use client";

import { useState, useEffect, DragEvent } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useReactFlow } from "@xyflow/react";

type SidebarTab = "models" | "faces" | "swipe" | null;

type SwipeEntry = {
  title: string;
  filename: string;
  size: number;
};

type YouTubeItem = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  addedAt: string;
};

type FaceReaction = {
  filename: string;
  label: string;
  size: number;
};

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>(null);
  const [swipeEntries, setSwipeEntries] = useState<SwipeEntry[]>([]);
  const [youtubeItems, setYoutubeItems] = useState<YouTubeItem[]>([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [swipeSearch, setSwipeSearch] = useState("");
  const [faceReactions, setFaceReactions] = useState<FaceReaction[]>([]);
  const addNode = useCanvasStore((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();

  // Load static swipe files
  useEffect(() => {
    fetch("/swipe-file/manifest.json")
      .then((r) => r.json())
      .then(setSwipeEntries)
      .catch(() => {});
  }, []);

  // Load face reactions
  useEffect(() => {
    fetch("/face-reactions/manifest.json")
      .then((r) => r.json())
      .then(setFaceReactions)
      .catch(() => {});
  }, []);

  // Load YouTube playlist items
  useEffect(() => {
    const fetchPlaylist = () => {
      setYoutubeLoading(true);
      fetch("/api/youtube/playlist")
        .then((r) => r.json())
        .then((data) => {
          if (data.items) setYoutubeItems(data.items);
        })
        .catch(() => {})
        .finally(() => setYoutubeLoading(false));
    };

    fetchPlaylist();
    // Poll every 5 minutes
    const interval = setInterval(fetchPlaylist, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTab = (tab: SidebarTab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const addAtCenter = (type: string, data?: Record<string, unknown>) => {
    const pos = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    pos.x += (Math.random() - 0.5) * 100;
    pos.y += (Math.random() - 0.5) * 100;
    addNode(type, pos, data);
  };

  const onDragStart = (e: DragEvent, type: string, data?: Record<string, unknown>) => {
    e.dataTransfer.setData("application/reactflow-type", type);
    if (data) {
      e.dataTransfer.setData("application/reactflow-data", JSON.stringify(data));
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const onSwipeDragStart = (e: DragEvent, imageUrl: string, label: string) => {
    e.dataTransfer.setData("application/reactflow-type", "swipeFile");
    e.dataTransfer.setData(
      "application/reactflow-data",
      JSON.stringify({ imageUrl, label })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const filteredSwipe = swipeEntries.filter((e) =>
    e.title.toLowerCase().includes(swipeSearch.toLowerCase())
  );
  const filteredYoutube = youtubeItems.filter((e) =>
    e.title.toLowerCase().includes(swipeSearch.toLowerCase())
  );

  return (
    <div className="absolute top-0 left-0 bottom-0 z-10 flex">
      {/* Icon bar */}
      <div
        className="flex flex-col items-center py-4 gap-1"
        style={{
          width: 56,
          background: "var(--canvas-bg)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div className="mb-4 p-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--accent)" strokeWidth="0">
            <rect x="2" y="4" width="4" height="16" rx="1" />
            <rect x="10" y="4" width="4" height="16" rx="1" />
            <rect x="18" y="4" width="4" height="16" rx="1" />
          </svg>
        </div>

        <SidebarIcon
          active={activeTab === "faces"}
          onClick={() => toggleTab("faces")}
          title="Face Reactions"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </SidebarIcon>

        <SidebarIcon
          active={activeTab === "models"}
          onClick={() => toggleTab("models")}
          title="Image Models"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 15l5-5 4 4 4-6 5 7" />
            <circle cx="15" cy="8" r="1.5" />
          </svg>
        </SidebarIcon>

        <SidebarIcon
          active={activeTab === "swipe"}
          onClick={() => toggleTab("swipe")}
          title="Swipe Files"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="8" height="8" rx="1" />
            <rect x="14" y="2" width="8" height="8" rx="1" />
            <rect x="2" y="14" width="8" height="8" rx="1" />
            <rect x="14" y="14" width="8" height="8" rx="1" />
          </svg>
        </SidebarIcon>
      </div>

      {/* Expandable panel */}
      {activeTab && (
        <div
          className="overflow-y-auto"
          style={{
            width: activeTab === "swipe" || activeTab === "faces" ? 300 : 240,
            background: "var(--canvas-bg)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            maxHeight: "100vh",
          }}
        >
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-4">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none"
                style={{
                  background: "var(--surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid transparent",
                }}
              />
            </div>

            {activeTab === "faces" && (
              <>
                <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Face Reactions
                </h3>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Click to add to canvas ({faceReactions.length})
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {faceReactions.map((face) => (
                    <div
                      key={face.filename}
                      draggable
                      onClick={() =>
                        addAtCenter("faceReference", {
                          imageUrl: `/face-reactions/${face.filename}`,
                          label: face.label,
                        })
                      }
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/reactflow-type", "faceReference");
                        e.dataTransfer.setData(
                          "application/reactflow-data",
                          JSON.stringify({
                            imageUrl: `/face-reactions/${face.filename}`,
                            label: face.label,
                          })
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-pointer rounded-lg overflow-hidden transition-all"
                      style={{ border: "1px solid transparent" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--surface)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <img
                        src={`/face-reactions/${face.filename}`}
                        alt={face.label}
                        className="w-full aspect-video object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "swipe" && (
              <>
                <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Swipe Files
                </h3>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Drag to canvas as reference
                </p>

                {/* Search */}
                <div className="relative mb-3">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search thumbnails..."
                    value={swipeSearch}
                    onChange={(e) => setSwipeSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none"
                    style={{
                      background: "var(--surface)",
                      color: "var(--text-secondary)",
                      border: "1px solid transparent",
                    }}
                  />
                </div>

                {/* YouTube Playlist Section */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF0000" strokeWidth="0">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                      <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff" />
                    </svg>
                    <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                      YouTube Playlist
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      ({filteredYoutube.length})
                    </span>
                  </div>

                  {youtubeLoading && youtubeItems.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
                      Loading playlist...
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredYoutube.map((item) => (
                        <div
                          key={item.videoId}
                          draggable
                          onClick={() =>
                            addAtCenter("swipeFile", {
                              imageUrl: item.thumbnailUrl,
                              label: item.title,
                            })
                          }
                          onDragStart={(e) =>
                            onSwipeDragStart(e, item.thumbnailUrl, item.title)
                          }
                          className="cursor-pointer rounded-lg overflow-hidden transition-all"
                          style={{ border: "1px solid transparent" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--surface)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                        >
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full aspect-video object-cover"
                            loading="lazy"
                          />
                          <div className="px-1.5 py-1" style={{ background: "var(--node-bg)" }}>
                            <p
                              className="text-[10px] truncate"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {item.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Static Swipe Files Section */}
                {filteredSwipe.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                        Saved Thumbnails
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        ({filteredSwipe.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredSwipe.map((entry) => (
                        <div
                          key={entry.filename}
                          draggable
                          onClick={() =>
                            addAtCenter("swipeFile", {
                              imageUrl: `/swipe-file/${entry.filename}`,
                              label: entry.title,
                            })
                          }
                          onDragStart={(e) =>
                            onSwipeDragStart(e, `/swipe-file/${entry.filename}`, entry.title)
                          }
                          className="cursor-pointer rounded-lg overflow-hidden transition-all"
                          style={{ border: "1px solid transparent" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--surface)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                        >
                          <img
                            src={`/swipe-file/${entry.filename}`}
                            alt={entry.title}
                            className="w-full aspect-video object-cover"
                            loading="lazy"
                          />
                          <div className="px-1.5 py-1" style={{ background: "var(--node-bg)" }}>
                            <p
                              className="text-[10px] truncate"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {entry.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredSwipe.length === 0 && filteredYoutube.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                    No thumbnails found
                  </p>
                )}
              </>
            )}

            {activeTab === "models" && (
              <>
                <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  Image Models
                </h3>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Generate from text
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addAtCenter("generator", { model: "nano-banana" })}
                    draggable
                    onDragStart={(e) => onDragStart(e, "generator", { model: "nano-banana" })}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: "var(--node-bg)",
                      border: "1px solid transparent",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--surface)";
                      e.currentTarget.style.background = "var(--node-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.background = "var(--node-bg)";
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)" strokeWidth="0">
                      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
                    </svg>
                    <span className="text-xs font-medium">Nano Banana 2</span>
                  </button>
                  <button
                    onClick={() => addAtCenter("generator", { model: "ideogram" })}
                    draggable
                    onDragStart={(e) => onDragStart(e, "generator", { model: "ideogram" })}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: "var(--node-bg)",
                      border: "1px solid transparent",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--surface)";
                      e.currentTarget.style.background = "var(--node-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.background = "var(--node-bg)";
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BB68FF" strokeWidth="1.5">
                      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-xs font-medium">Ideogram v3</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarIcon({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2.5 rounded-xl transition-all"
      style={{
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-tertiary)",
      }}
    >
      {children}
    </button>
  );
}

