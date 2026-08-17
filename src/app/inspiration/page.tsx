"use client";

import { useState, useCallback, useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";

interface InspirationItem {
  id: string;
  url: string;
  title: string;
  screenshot: string | null;
  colors: string[];
  fonts: string[];
  platform: string;
  tags: string[];
  collection: string;
  createdAt: string;
}

const STORAGE_KEY = "design-lab-inspiration";
const COLLECTIONS_KEY = "design-lab-collections";

function loadItems(): InspirationItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveItems(items: InspirationItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadCollections(): string[] {
  try {
    return JSON.parse(localStorage.getItem(COLLECTIONS_KEY) || '["General"]');
  } catch { return ["General"]; }
}

function saveCollections(cols: string[]) {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(cols));
}

/* ── Add from URL ── */
async function analyzeAndSave(url: string, collection: string): Promise<InspirationItem | null> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const d = await res.json();
    if (!res.ok) return null;
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      url: d.url,
      title: d.title || d.url,
      screenshot: d.screenshots?.desktop || null,
      colors: d.colors || [],
      fonts: d.fonts || [],
      platform: d.platform?.platform || "Unknown",
      tags: [],
      collection,
      createdAt: new Date().toISOString(),
    };
  } catch { return null; }
}

/* ── Tag suggestions based on colors ── */
function autoTags(colors: string[]): string[] {
  const tags: string[] = [];
  for (const c of colors.slice(0, 3)) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    const lum = (r + g + b) / 3;
    if (lum < 60) tags.push("dark");
    else if (lum > 200) tags.push("light");
    if (r > g + 40 && r > b + 40) tags.push("warm");
    if (b > r + 40 && b > g + 40) tags.push("cool");
    if (g > r + 30 && g > b + 30) tags.push("green");
    if (r > 180 && g < 100 && b < 100) tags.push("red");
    if (r > 180 && g > 120 && b < 80) tags.push("orange");
    if (r > 100 && g < 80 && b > 180) tags.push("purple");
  }
  return [...new Set(tags)].slice(0, 4);
}

/* ── Main page ── */
export default function InspirationPage() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [collections, setCollections] = useState<string[]>(["General"]);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InspirationItem | null>(null);
  const [newCollection, setNewCollection] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating saved items from localStorage — browser-only, runs once on mount
    setItems(loadItems());
    setCollections(loadCollections());
  }, []);

  const addSite = useCallback(async () => {
    if (!url.trim()) return;
    setAdding(true);
    setError("");
    const col = activeCollection === "All" ? "General" : activeCollection;
    const item = await analyzeAndSave(url.trim(), col);
    if (item) {
      item.tags = autoTags(item.colors);
      const updated = [item, ...items];
      setItems(updated);
      saveItems(updated);
      setUrl("");
    } else {
      setError("Could not analyze that URL");
    }
    setAdding(false);
  }, [url, items, activeCollection]);

  const removeItem = useCallback((id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveItems(updated);
    if (selectedItem?.id === id) setSelectedItem(null);
  }, [items, selectedItem]);

  const addCollection = useCallback(() => {
    const name = newCollection.trim();
    if (!name || collections.includes(name)) return;
    const updated = [...collections, name];
    setCollections(updated);
    saveCollections(updated);
    setNewCollection("");
  }, [newCollection, collections]);

  const filtered = items.filter(item => {
    if (activeCollection !== "All" && item.collection !== activeCollection) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.tags.some(t => t.includes(q)) ||
        item.platform.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0c0a14] text-white">
      <SiteHeader subtitle="Design references" />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Add URL */}
        <div className="mb-6 flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSite()}
            placeholder="Add a site URL to your library…" dir="ltr"
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500" />
          <button onClick={addSite} disabled={adding}
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50">
            {adding ? "Analyzing…" : "+ Add"}
          </button>
        </div>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {/* Collections + Search */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button onClick={() => setActiveCollection("All")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCollection === "All" ? "bg-violet-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
            All ({items.length})
          </button>
          {collections.map(col => (
            <button key={col} onClick={() => setActiveCollection(col)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCollection === col ? "bg-violet-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
              {col} ({items.filter(i => i.collection === col).length})
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input value={newCollection} onChange={(e) => setNewCollection(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCollection()}
              placeholder="New collection…" dir="ltr"
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500" />
            <button onClick={addCollection} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/20">+</button>
          </div>
        </div>

        {/* Search */}
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, URL, tag, platform…" dir="ltr"
          className="mb-6 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500" />

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl">💡</p>
            <p className="mt-3 text-sm text-white/65">
              {items.length === 0 ? "Add your first design reference above" : "No matches found"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(item => (
              <div key={item.id} onClick={() => setSelectedItem(item)}
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-3 transition-all hover:-translate-y-1 hover:border-white/25">
                {item.screenshot ? (
                  <img src={item.screenshot} alt={item.title} className="mb-3 h-36 w-full rounded-lg object-cover object-top" />
                ) : (
                  <div className="mb-3 flex h-36 items-center justify-center rounded-lg bg-white/5 text-3xl">🌐</div>
                )}
                <div className="mb-1 truncate text-sm font-semibold">{item.title}</div>
                <div className="mb-2 truncate text-xs text-white/65" dir="ltr">{item.url}</div>
                <div className="flex items-center gap-1.5">
                  {item.colors.slice(0, 5).map(c => (
                    <span key={c} className="inline-block h-4 w-4 rounded border border-white/20" style={{ background: c }} />
                  ))}
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/65">{item.platform}</span>
                </div>
                {item.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.tags.map(t => (
                      <span key={t} className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-200">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Detail modal */}
        {selectedItem && (
          <>
            <button className="fixed inset-0 z-40 bg-black/60" onClick={() => setSelectedItem(null)} aria-label="Close" />
            <div className="fixed inset-x-4 top-[10vh] z-50 mx-auto max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#161322] p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{selectedItem.title}</h3>
                  <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" dir="ltr"
                    className="text-sm text-violet-400 hover:text-violet-200">{selectedItem.url} ↗</a>
                </div>
                <button onClick={() => setSelectedItem(null)} className="rounded-lg px-3 py-1 text-white/65 hover:bg-white/10">✕</button>
              </div>

              {selectedItem.screenshot && (
                <img src={selectedItem.screenshot} alt={selectedItem.title} className="mb-4 w-full rounded-xl border border-white/10" />
              )}

              <div className="mb-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/65">Palette</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.colors.map(c => (
                    <div key={c} className="text-center">
                      <span className="inline-block h-10 w-10 rounded-lg border border-white/20" style={{ background: c }} />
                      <span className="mt-1 block text-[10px] text-white/60" dir="ltr">{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/65">Fonts</h4>
                <p className="text-sm text-white/75">{selectedItem.fonts.join(", ") || "None detected"}</p>
              </div>

              <div className="mb-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/65">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.tags.map(t => (
                    <span key={t} className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs text-violet-200">{t}</span>
                  ))}
                </div>
              </div>

              {/* Copy Brief */}
              <button
                onClick={() => {
                  const brief = `Design reference: ${selectedItem.title}\nURL: ${selectedItem.url}\nPlatform: ${selectedItem.platform}\nColors: ${selectedItem.colors.join(", ")}\nFonts: ${selectedItem.fonts.join(", ")}\nTags: ${selectedItem.tags.join(", ")}\n\nUse this as a visual reference for the aesthetic direction. Match the feel and style, not the content.`;
                  navigator.clipboard.writeText(brief);
                }}
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500">
                📋 Copy Design Brief
              </button>

              <button onClick={() => removeItem(selectedItem.id)}
                className="mt-2 w-full rounded-lg bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20">
                🗑 Remove from library
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
