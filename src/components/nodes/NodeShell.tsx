"use client";

import { ReactNode, useState, useRef, useEffect } from "react";

export default function NodeShell({
  children,
  title,
  icon,
  onDelete,
  onDuplicate,
  width = 460,
}: {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  onDelete?: () => void;
  onDuplicate?: () => void;
  width?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div
      className="node-card rounded-2xl border-2 border-transparent transition-all"
      style={{
        width,
        background: "var(--node-bg)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {title}
          </span>
        </div>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-md transition-colors nopan nodrag"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="4" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="12" cy="8" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden shadow-2xl min-w-[140px] py-1 z-50 nopan nodrag"
              style={{
                background: "var(--node-bg)",
                border: "1px solid var(--surface)",
              }}
            >
              {onDuplicate && (
                <NodeMenuItem
                  label="Duplicate"
                  onClick={() => {
                    onDuplicate();
                    setMenuOpen(false);
                  }}
                />
              )}
              {onDelete && (
                <NodeMenuItem
                  label="Delete"
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                  danger
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function NodeMenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-xs transition-colors"
      style={{ color: danger ? "#EF9092" : "var(--text-secondary)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}
