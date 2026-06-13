"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import LookupList from "@/components/lookups/LookupList";
import { LookupItem } from "@/types";

type Tab = "types" | "colors" | "occasions" | "tags";

const TABS: { key: Tab; label: string }[] = [
  { key: "types", label: "Types" },
  { key: "colors", label: "Colors" },
  { key: "occasions", label: "Occasions" },
  { key: "tags", label: "Tags" },
];

export default function ManageListsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("types");

  const [itemTypes, setItemTypes] = useState<LookupItem[]>([]);
  const [colors, setColors] = useState<LookupItem[]>([]);
  const [occasions, setOccasions] = useState<LookupItem[]>([]);
  const [tags, setTags] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, colorsRes, occasionsRes, tagsRes] = await Promise.all([
        fetch("/api/lookups/item-types"),
        fetch("/api/lookups/colors"),
        fetch("/api/lookups/occasions"),
        fetch("/api/lookups/tags"),
      ]);

      const [typesData, colorsData, occasionsData, tagsData] = await Promise.all([
        typesRes.json(),
        colorsRes.json(),
        occasionsRes.json(),
        tagsRes.json(),
      ]);

      setItemTypes(typesData.data || []);
      setColors(colorsData.data || []);
      setOccasions(occasionsData.data || []);
      setTags(tagsData.data || []);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddItemType = async (name: string) => {
    const res = await fetch("/api/lookups/item-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId: user?.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add");
    setItemTypes((prev) =>
      [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name))
    );
    showToast(`"${name}" added successfully`, "success");
  };

  const handleEditItemType = async (id: string, name: string) => {
    const res = await fetch(`/api/lookups/item-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId: user?.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update");
    setItemTypes((prev) =>
      prev
        .map((t) => (t.id === id ? data.data : t))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    showToast("Updated successfully", "success");
  };

  const handleDeleteItemType = async (id: string) => {
    const res = await fetch(`/api/lookups/item-types/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete");
    }
    setItemTypes((prev) => prev.filter((t) => t.id !== id));
    showToast("Deleted successfully", "success");
  };

  const handleAddColor = async (name: string, extra?: Record<string, string>) => {
    const res = await fetch("/api/lookups/colors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, hexCode: extra?.hexCode || null, userId: user?.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add");
    setColors((prev) =>
      [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name))
    );
    showToast(`"${name}" added successfully`, "success");
  };

  const handleEditColor = async (id: string, name: string, extra?: Record<string, string>) => {
    const res = await fetch(`/api/lookups/colors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, hexCode: extra?.hexCode || null, userId: user?.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update");
    setColors((prev) =>
      prev
        .map((c) => (c.id === id ? data.data : c))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    showToast("Updated successfully", "success");
  };

  const handleDeleteColor = async (id: string) => {
    const res = await fetch(`/api/lookups/colors/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete");
    }
    setColors((prev) => prev.filter((c) => c.id !== id));
    showToast("Deleted successfully", "success");
  };

  const handleAddOccasion = async (name: string) => {
    const res = await fetch("/api/lookups/occasions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId: user?.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add");
    setOccasions((prev) =>
      [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name))
    );
    showToast(`"${name}" added successfully`, "success");
  };

  const handleEditOccasion = async (id: string, name: string) => {
    const res = await fetch(`/api/lookups/occasions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId: user?.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update");
    setOccasions((prev) =>
      prev
        .map((o) => (o.id === id ? data.data : o))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    showToast("Updated successfully", "success");
  };

  const handleDeleteOccasion = async (id: string) => {
    const res = await fetch(`/api/lookups/occasions/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete");
    }
    setOccasions((prev) => prev.filter((o) => o.id !== id));
    showToast("Deleted successfully", "success");
  };

  const handleAddTag = async (name: string) => {
    const res = await fetch("/api/lookups/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId: user?.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add");
    setTags((prev) =>
      [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name))
    );
    showToast(`"${name}" added successfully`, "success");
  };

  const handleEditTag = async (id: string, name: string) => {
    const res = await fetch(`/api/lookups/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId: user?.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update");
    setTags((prev) =>
      prev
        .map((t) => (t.id === id ? data.data : t))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    showToast("Updated successfully", "success");
  };

  const handleDeleteTag = async (id: string) => {
    const res = await fetch(`/api/lookups/tags/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete");
    }
    setTags((prev) => prev.filter((t) => t.id !== id));
    showToast("Deleted successfully", "success");
  };

  const withErrorToast = <T extends unknown[]>(fn: (...args: T) => Promise<void>) =>
    async (...args: T) => {
      try {
        await fn(...args);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Something went wrong", "error");
      }
    };

  return (
    <div className="min-h-screen bg-brand-background">
      {/* Page header */}
      <div className="sticky top-0 z-10 bg-white border-b border-brand-secondary/20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 text-brand-text-muted hover:text-brand-primary hover:bg-brand-secondary/10 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-xl font-semibold text-brand-primary">
          Manage Lists
        </h1>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-brand-secondary/20 px-4 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-primary text-brand-primary font-semibold"
                : "border-transparent text-brand-text-muted hover:text-brand-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto pb-28 md:pb-8">
        {activeTab === "types" && (
          <LookupList
            title="Types"
            items={itemTypes}
            onAdd={withErrorToast(handleAddItemType)}
            onEdit={withErrorToast(handleEditItemType)}
            onDelete={withErrorToast(handleDeleteItemType)}
            loading={loading}
          />
        )}
        {activeTab === "colors" && (
          <LookupList
            title="Colors"
            items={colors}
            onAdd={withErrorToast(handleAddColor)}
            onEdit={withErrorToast(handleEditColor)}
            onDelete={withErrorToast(handleDeleteColor)}
            showColorSwatch
            loading={loading}
          />
        )}
        {activeTab === "occasions" && (
          <LookupList
            title="Occasions"
            items={occasions}
            onAdd={withErrorToast(handleAddOccasion)}
            onEdit={withErrorToast(handleEditOccasion)}
            onDelete={withErrorToast(handleDeleteOccasion)}
            loading={loading}
          />
        )}
        {activeTab === "tags" && (
          <LookupList
            title="Tags"
            items={tags}
            onAdd={withErrorToast(handleAddTag)}
            onEdit={withErrorToast(handleEditTag)}
            onDelete={withErrorToast(handleDeleteTag)}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
