import { useCallback, useEffect, useState } from "react";
import Drawer from "../components/Drawer";
import TargetField from "../components/TargetField";
import { reorder } from "../lib/reorder";
import { supabase } from "../lib/supabase";
import { ICONS } from "../lib/targets";
import type { AdminHomeLink } from "../lib/types";

type FormState = {
  id: string | null;
  label: string;
  detail: string;
  icon: string;
  target: string;
  is_published: boolean;
};

const blank: FormState = {
  id: null,
  label: "",
  detail: "",
  icon: "star-outline",
  target: "",
  is_published: true,
};

const HEADINGS = [
  { key: "home.links_title", label: "SECTION TITLE", fallback: "MORE THAN A MARKET." },
  { key: "home.links_note", label: "SMALL NOTE NEXT TO IT", fallback: "THE STREETSOUK WORLD" },
  { key: "home.radar_title", label: "EVENT SECTION TITLE", fallback: "ON THE RADAR" },
];

export default function HomeLinks() {
  const [links, setLinks] = useState<AdminHomeLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [headings, setHeadings] = useState<Record<string, string>>({});
  const [headingsSaving, setHeadingsSaving] = useState(false);
  const [headingsMsg, setHeadingsMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [l, s] = await Promise.all([
      supabase
        .from("home_links")
        .select("*")
        .order("sort_order")
        .order("created_at"),
      supabase.from("app_settings").select("key, value"),
    ]);
    if (l.error) setError(l.error.message);
    else {
      setLinks(l.data as AdminHomeLink[]);
      setError(null);
    }
    if (s.data) {
      const next: Record<string, string> = {};
      for (const row of s.data as { key: string; value: string }[]) {
        next[row.key] = row.value;
      }
      setHeadings(next);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!form) return;
    if (!form.label.trim()) {
      setFormError("A title is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      label: form.label.trim(),
      detail: form.detail.trim() || null,
      icon: form.icon,
      target: form.target.trim() || null,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("home_links").update(payload).eq("id", form.id)
      : await supabase
          .from("home_links")
          .insert({ ...payload, sort_order: links.length });
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    load();
  }

  async function remove() {
    if (!form?.id) return;
    if (!window.confirm(`Delete "${form.label}"?`)) return;
    setSaving(true);
    const { error } = await supabase
      .from("home_links")
      .delete()
      .eq("id", form.id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    load();
  }

  async function togglePublished(link: AdminHomeLink) {
    const { error } = await supabase
      .from("home_links")
      .update({ is_published: !link.is_published })
      .eq("id", link.id);
    if (error) setError(error.message);
    else load();
  }

  async function move(index: number, direction: -1 | 1) {
    const failure = await reorder("home_links", links, index, direction);
    if (failure) setError(failure);
    load();
  }

  async function saveHeadings() {
    setHeadingsSaving(true);
    setHeadingsMsg(null);
    let failure: string | null = null;
    for (const h of HEADINGS) {
      const value = (headings[h.key] ?? "").trim();
      // empty means "use the built-in default"
      const { error } = value
        ? await supabase.from("app_settings").upsert({ key: h.key, value })
        : await supabase.from("app_settings").delete().eq("key", h.key);
      if (error) failure = error.message;
    }
    setHeadingsSaving(false);
    setHeadingsMsg(failure ?? "Saved.");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">HOME SCREEN</p>
          <h1 className="display">LINKS & HEADINGS</h1>
        </div>
        <button
          className="btn"
          onClick={() => {
            setForm({ ...blank });
            setFormError(null);
          }}
        >
          + NEW LINK
        </button>
      </div>

      <div className="panel">
        <p className="kicker" style={{ marginBottom: 14 }}>
          SECTION HEADINGS
        </p>
        <div className="row3">
          {HEADINGS.map((h) => (
            <div className="field" key={h.key}>
              <label className="label" htmlFor={h.key}>
                {h.label}
              </label>
              <input
                id={h.key}
                className="input"
                value={headings[h.key] ?? ""}
                placeholder={h.fallback}
                onChange={(e) =>
                  setHeadings((cur) => ({ ...cur, [h.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div className="row-actions" style={{ marginTop: 16, alignItems: "center" }}>
          <button className="btn small" onClick={saveHeadings} disabled={headingsSaving}>
            {headingsSaving ? "SAVING..." : "SAVE HEADINGS"}
          </button>
          {headingsMsg && <span className="muted small">{headingsMsg}</span>}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>LINK</th>
                <th>GOES TO</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {links.map((l, i) => (
                <tr key={l.id}>
                  <td>
                    <div className="move">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === links.length - 1}
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td>
                    <strong>{l.label}</strong>
                    <div className="muted small">{l.detail ?? ""}</div>
                  </td>
                  <td className="muted small">{l.target ?? "–"}</td>
                  <td>
                    <button
                      className={`badge ${l.is_published ? "on" : "off"}`}
                      onClick={() => togglePublished(l)}
                      title="Click to toggle"
                    >
                      {l.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                  </td>
                  <td className="right">
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setForm({
                          id: l.id,
                          label: l.label,
                          detail: l.detail ?? "",
                          icon: l.icon,
                          target: l.target ?? "",
                          is_published: l.is_published,
                        });
                        setFormError(null);
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted center">
                    No links yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT LINK" : "NEW LINK"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="k-label">
              TITLE
            </label>
            <input
              id="k-label"
              className="input"
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              placeholder="THE STORE"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="k-detail">
              SHORT DESCRIPTION
            </label>
            <input
              id="k-detail"
              className="input"
              value={form.detail}
              onChange={(e) => update("detail", e.target.value)}
              placeholder="Independent labels. New drops."
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="k-icon">
              ICON
            </label>
            <select
              id="k-icon"
              className="input"
              value={form.icon}
              onChange={(e) => update("icon", e.target.value)}
            >
              {!ICONS.includes(form.icon) && (
                <option value={form.icon}>{form.icon}</option>
              )}
              {ICONS.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>
          <TargetField
            label="OPENS"
            value={form.target}
            onChange={(v) => update("target", v)}
          />
          <div className="field checks">
            <label className="check">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => update("is_published", e.target.checked)}
              />
              PUBLISHED
            </label>
          </div>
        </Drawer>
      )}
    </>
  );
}