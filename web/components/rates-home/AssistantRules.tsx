"use client";

// Expert "Rules" the chatters inject into the assistant. Anyone with chat
// access can add a rule + toggle it; you can edit/delete your own (superadmin
// can manage all). Enabled rules are appended to the AI's instructions.

import { useEffect, useState } from "react";
import { Settings2, X, Trash2, Plus } from "lucide-react";

interface Rule {
  id: string;
  title: string;
  body: string;
  category: string | null;
  enabled: boolean;
  createdBy: string | null;
  createdByEmail: string | null;
}

export function RulesButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Expert rules the assistant follows"
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-[12px] font-medium text-zinc-600 shadow-sm backdrop-blur hover:border-zinc-300 hover:text-zinc-900"
      >
        <Settings2 className="size-3.5" strokeWidth={1.75} />
        Rules
      </button>
      {open ? <RulesPanel onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function RulesPanel({ onClose }: { onClose: () => void }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [me, setMe] = useState<{ id: string; superadmin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/rates/assistant/rules");
      const d = await r.json();
      setRules(d.rules ?? []);
      setMe(d.me ?? null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const canEdit = (rule: Rule) => !!me && (me.superadmin || rule.createdBy === me.id);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/rates/assistant/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category }),
      });
      if (!r.ok) throw new Error((await r.json())?.error ?? "Failed");
      setTitle("");
      setBody("");
      setCategory("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (rule: Rule) => {
    await fetch("/api/rates/assistant/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
    });
    void load();
  };
  const del = async (rule: Rule) => {
    await fetch(`/api/rates/assistant/rules?id=${rule.id}`, { method: "DELETE" });
    void load();
  };

  const enabledCount = rules.filter((r) => r.enabled).length;
  const field =
    "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-zinc-400";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4" onMouseDown={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">Expert rules</h2>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Guidance the assistant follows on every question. {enabledCount} active.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="size-4" />
          </button>
        </div>

        {/* list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="py-6 text-center text-[13px] text-zinc-400">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-zinc-400">No rules yet — add the first one below.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rules.map((rule) => (
                <li key={rule.id} className="rounded-lg border border-zinc-200 p-2.5">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => canEdit(rule) && toggle(rule)}
                      disabled={!canEdit(rule)}
                      title={canEdit(rule) ? "Toggle" : "Only the author or a superadmin can change this"}
                      className={
                        "mt-0.5 h-4 w-7 shrink-0 rounded-full p-0.5 transition-colors " +
                        (rule.enabled ? "bg-emerald-500" : "bg-zinc-300") +
                        (canEdit(rule) ? " cursor-pointer" : " cursor-not-allowed opacity-60")
                      }
                    >
                      <span className={"block size-3 rounded-full bg-white transition-transform " + (rule.enabled ? "translate-x-3" : "")} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-zinc-800">{rule.title}</span>
                        {rule.category ? (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{rule.category}</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[12px] leading-snug text-zinc-600">{rule.body}</p>
                      <p className="mt-1 text-[10.5px] text-zinc-400">{rule.createdByEmail ?? "—"}</p>
                    </div>
                    {canEdit(rule) ? (
                      <button onClick={() => del(rule)} title="Delete" className="rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* add */}
        <form onSubmit={add} className="border-t border-zinc-100 px-5 py-3.5">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input className={field + " flex-1"} placeholder="Rule title (e.g. Contingency by stage)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className={field + " w-40"} placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <textarea className={field + " resize-none"} rows={2} maxLength={500} placeholder="The rule, e.g. 'Contingency ≈ 10% at concept, 5% at schematic, 0% by DD/IFC.'" value={body} onChange={(e) => setBody(e.target.value)} />
            {err ? <p className="text-[12px] text-red-600">{err}</p> : null}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">{body.length}/500</span>
              <button
                type="submit"
                disabled={busy || !title.trim() || !body.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                <Plus className="size-3.5" />
                {busy ? "Adding…" : "Add rule"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
