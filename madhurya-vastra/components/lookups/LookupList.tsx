"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { LookupItem } from "@/types";

interface LookupListProps {
  title: string;
  items: LookupItem[];
  onAdd: (name: string, extra?: Record<string, string>) => Promise<void>;
  onEdit: (id: string, name: string, extra?: Record<string, string>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showColorSwatch?: boolean;
  loading?: boolean;
}

export default function LookupList({
  title,
  items,
  onAdd,
  onEdit,
  onDelete,
  showColorSwatch = false,
  loading = false,
}: LookupListProps) {
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHex, setEditHex] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) addInputRef.current?.focus();
  }, [isAdding]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newName.trim() || actionLoading) return;
    setActionLoading(true);
    try {
      const extra: Record<string, string> = {};
      if (showColorSwatch && newHex) extra.hexCode = newHex;
      await onAdd(newName.trim(), extra);
      setNewName("");
      setNewHex("");
      setIsAdding(false);
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (item: LookupItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditHex(item.hexCode || "");
    setDeletingId(null);
  };

  const handleEdit = async () => {
    if (!editingId || !editName.trim() || actionLoading) return;
    setActionLoading(true);
    try {
      const extra: Record<string, string> = {};
      if (showColorSwatch) extra.hexCode = editHex;
      await onEdit(editingId, editName.trim(), extra);
      setEditingId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await onDelete(id);
      setDeletingId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewName("");
    setNewHex("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditHex("");
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-brand-secondary/10 rounded-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + Add button */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-brand-secondary/30 rounded-input text-sm text-brand-text-primary placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary bg-white"
        />
        <button
          onClick={() => {
            setIsAdding(true);
            setDeletingId(null);
            setEditingId(null);
          }}
          className="flex items-center gap-1 px-3 py-2 bg-brand-primary text-white text-sm font-medium rounded-input hover:bg-brand-secondary transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add New
        </button>
      </div>

      {/* Add new inline card */}
      {isAdding && (
        <div className="bg-white border-2 border-brand-primary/40 rounded-card p-3 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            {showColorSwatch && (
              <div
                className="w-8 h-8 rounded-full border-2 border-brand-secondary/30 shrink-0"
                style={{ backgroundColor: newHex || "#E5E7EB" }}
              />
            )}
            <input
              ref={addInputRef}
              type="text"
              placeholder={`${title} name`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") cancelAdd();
              }}
              maxLength={50}
              className="flex-1 px-3 py-1.5 border border-brand-secondary/30 rounded-input text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
          </div>
          {showColorSwatch && (
            <div className="flex items-center gap-2 pl-10">
              <input
                type="text"
                placeholder="#RRGGBB"
                value={newHex}
                onChange={(e) => setNewHex(e.target.value)}
                maxLength={7}
                className="w-28 px-3 py-1.5 border border-brand-secondary/30 rounded-input text-sm text-brand-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
              <input
                type="color"
                value={newHex || "#6B3FA0"}
                onChange={(e) => setNewHex(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-brand-secondary/30"
                title="Pick a color"
              />
              <span className="text-xs text-brand-text-muted">Optional</span>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelAdd}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-brand-text-muted border border-brand-secondary/30 rounded-input hover:bg-brand-background transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={actionLoading || !newName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-brand-primary text-white rounded-input hover:bg-brand-secondary transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {actionLoading ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isAdding && filtered.length === 0 && (
        <div className="text-center py-12 text-brand-text-muted text-sm">
          {items.length === 0
            ? `No ${title.toLowerCase()} yet. Add your first one above.`
            : `No results for "${search}".`}
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {filtered.map((item) => {
          const isEditing = editingId === item.id;
          const isDeleting = deletingId === item.id;

          if (isEditing) {
            return (
              <div
                key={item.id}
                className="lg:col-span-2 bg-white border-2 border-brand-primary/40 rounded-card p-3 shadow-sm space-y-2"
              >
                <div className="flex items-center gap-2">
                  {showColorSwatch && (
                    <div
                      className="w-8 h-8 rounded-full border-2 border-brand-secondary/30 shrink-0"
                      style={{ backgroundColor: editHex || "#E5E7EB" }}
                    />
                  )}
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    maxLength={50}
                    className="flex-1 px-3 py-1.5 border border-brand-secondary/30 rounded-input text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                  />
                </div>
                {showColorSwatch && (
                  <div className="flex items-center gap-2 pl-10">
                    <input
                      type="text"
                      placeholder="#RRGGBB"
                      value={editHex}
                      onChange={(e) => setEditHex(e.target.value)}
                      maxLength={7}
                      className="w-28 px-3 py-1.5 border border-brand-secondary/30 rounded-input text-sm text-brand-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                    />
                    <input
                      type="color"
                      value={editHex || "#6B3FA0"}
                      onChange={(e) => setEditHex(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-brand-secondary/30"
                      title="Pick a color"
                    />
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-brand-text-muted border border-brand-secondary/30 rounded-input hover:bg-brand-background transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={actionLoading || !editName.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-brand-primary text-white rounded-input hover:bg-brand-secondary transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {actionLoading ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            );
          }

          if (isDeleting) {
            return (
              <div
                key={item.id}
                className="bg-white border border-red-200 rounded-card p-3 shadow-sm"
              >
                <p className="text-sm text-brand-text-primary mb-3">
                  Delete <span className="font-semibold">{item.name}</span>? Items using this will not be affected.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-3 py-1.5 text-sm text-brand-text-muted border border-brand-secondary/30 rounded-input hover:bg-brand-background transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-input hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="bg-white border border-brand-secondary/20 rounded-card px-4 py-3 flex items-center gap-3 shadow-sm"
            >
              {showColorSwatch && (
                <div
                  className="w-7 h-7 rounded-full border border-brand-secondary/30 shrink-0"
                  style={{ backgroundColor: item.hexCode || "#E5E7EB" }}
                />
              )}
              <span className="flex-1 text-sm text-brand-text-primary font-medium truncate">
                {item.name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    startEdit(item);
                    setDeletingId(null);
                  }}
                  className="p-1.5 text-brand-text-muted hover:text-brand-primary hover:bg-brand-secondary/10 rounded-md transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setDeletingId(item.id);
                    setEditingId(null);
                  }}
                  className="p-1.5 text-brand-text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
