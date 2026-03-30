"use client";

import { useState, useEffect, DragEvent } from "react";

type SwipeEntry = {
  title: string;
  filename: string;
  size: number;
};

export default function SwipeFilePanel() {
  const [entries, setEntries] = useState<SwipeEntry[]>([]);
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/swipe-file/manifest.json")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => {});
  }, []);

  const filtered = entries.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const onDragStart = (e: DragEvent, entry: SwipeEntry) => {
    e.dataTransfer.setData("application/reactflow-type", "swipeFile");
    e.dataTransfer.setData(
      "application/reactflow-data",
      JSON.stringify({
        imageUrl: `/swipe-file/${entry.filename}`,
        label: entry.title,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="absolute top-16 left-4 z-10 flex flex-col">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-xl px-3 py-2 shadow-2xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/90 transition-colors w-fit"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Swipe File
        <span className="text-zinc-600">({entries.length})</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-xl shadow-2xl w-72 max-h-[calc(100vh-140px)] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800">
            <input
              type="text"
              placeholder="Search thumbnails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="overflow-y-auto p-2 grid grid-cols-2 gap-2 scrollbar-thin">
            {filtered.map((entry) => (
              <div
                key={entry.filename}
                draggable
                onDragStart={(e) => onDragStart(e, entry)}
                className="group cursor-grab active:cursor-grabbing rounded-lg overflow-hidden border border-zinc-800 hover:border-amber-500/50 transition-colors"
              >
                <img
                  src={`/swipe-file/${entry.filename}`}
                  alt={entry.title}
                  className="w-full aspect-video object-cover"
                  loading="lazy"
                />
                <div className="px-1.5 py-1 bg-zinc-900">
                  <p className="text-[10px] text-zinc-500 group-hover:text-zinc-300 truncate transition-colors">
                    {entry.title}
                  </p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-2 text-xs text-zinc-600 text-center py-4">
                No thumbnails found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
