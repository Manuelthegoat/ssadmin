import { useCallback, useEffect, useState } from "react";
import Drawer from "../components/Drawer";
import ImageUpload from "../components/ImageUpload";
import TargetField from "../components/TargetField";
import { reorder } from "../lib/reorder";
import { supabase } from "../lib/supabase";
import type { AdminHomeTab } from "../lib/types";

type FormState = {
  id: string | null;
  label: string;
  kicker: string;
  title: string;
  intro: string;
  hero_text: string;
  hero_image_url: string | null;
  pill_text: string;
  pill_shows_event: boolean;
  action_label: string;
  action_target: string;
  is_published: boolean;
};

const blank: FormState = {
  id: null,
  label: "",
  kicker: "",
  title: "",
  intro: "",
  hero_text: "",
  hero_image_url: null,
  pill_text: "",
  pill_shows_event: false,
  action_label: "",
  action_target: "",
  is_published: true,
};

function toForm(t: AdminHomeTab): FormState {
  return {
    id: t.id,
    label: t.label,
    kicker: t.kicker ?? "",
    title: t.title ?? "",
    intro: t.intro ?? "",
    hero_text: t.hero_text ?? "",
    hero_image_url: t.hero_image_url,
    pill_text: t.pill_text ?? "",
    pill_shows_event: t.pill_shows_event,
    action_label: t.action_label ?? "",
    action_target: t.action_target ?? "",
    is_published: t.is_published,
  };
}

export default function HomeTabs() {
  const [tabs, setTabs] = useState<AdminHomeTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("home_tabs")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (error) setError(error.message);
    else {
      setTabs(data as AdminHomeTab[]);
      setError(null);
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
      setFormError("The tab name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      label: form.label.trim(),
      kicker: form.kicker.trim() || null,
      title: form.title.trim() || null,
      intro: form.intro.trim() || null,
      hero_text: form.hero_text.trim() || null,
      hero_image_url: form.hero_image_url,
      pill_text: form.pill_text.trim() || null,
      pill_shows_event: form.pill_shows_event,
      action_label: form.action_label.trim() || null,
      action_target: form.action_target.trim() || null,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("home_tabs").update(payload).eq("id", form.id)
      : await supabase
          .from("home_tabs")
          .insert({ ...payload, sort_order: tabs.length });
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
    if (!window.confirm(`Delete the ${form.label} tab?`)) return;
    setSaving(true);
    const { error } = await supabase.from("home_tabs").delete().eq("id", form.id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    load();
  }

  async function togglePublished(tab: AdminHomeTab) {
    const { error } = await supabase
      .from("home_tabs")
      .update({ is_published: !tab.is_published })
      .eq("id", tab.id);
    if (error) setError(error.message);
    else load();
  }

  async function move(index: number, direction: -1 | 1) {
    const failure = await reorder("home_tabs", tabs, index, direction);
    if (failure) setError(failure);
    load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">HOME SCREEN</p>
          <h1 className="display">HERO TABS</h1>
        </div>
        <button
          className="btn"
          onClick={() => {
            setForm({ ...blank });
            setFormError(null);
          }}
        >
          + NEW TAB
        </button>
      </div>
      <p className="muted small" style={{ marginBottom: 20 }}>
        The tabs along the top of the app's Home screen. The first one is what
        people see first.
      </p>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>TAB</th>
                <th>HEADLINE</th>
                <th>BUTTON</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tabs.map((t, i) => (
                <tr key={t.id}>
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
                        disabled={i === tabs.length - 1}
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td>
                    <strong>{t.label}</strong>
                  </td>
                  <td style={{ maxWidth: 300 }}>
                    {(t.title ?? "–").replace(/\n/g, " ")}
                  </td>
                  <td>
                    {t.action_label ?? "–"}
                    <div className="muted small">{t.action_target ?? ""}</div>
                  </td>
                  <td>
                    <button
                      className={`badge ${t.is_published ? "on" : "off"}`}
                      onClick={() => togglePublished(t)}
                      title="Click to toggle"
                    >
                      {t.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                  </td>
                  <td className="right">
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setForm(toForm(t));
                        setFormError(null);
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {tabs.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted center">
                    No tabs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT TAB" : "NEW TAB"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="t-label">
              TAB NAME
            </label>
            <input
              id="t-label"
              className="input"
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              placeholder="FOR YOU"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="t-kicker">
              SMALL LINE ABOVE THE HEADLINE
            </label>
            <input
              id="t-kicker"
              className="input"
              value={form.kicker}
              onChange={(e) => update("kicker", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="t-title">
              HEADLINE (PRESS ENTER FOR A NEW LINE)
            </label>
            <textarea
              id="t-title"
              className="input"
              rows={2}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="t-intro">
              INTRO TEXT
            </label>
            <textarea
              id="t-intro"
              className="input"
              rows={3}
              value={form.intro}
              onChange={(e) => update("intro", e.target.value)}
            />
          </div>
          <ImageUpload
            label="HERO IMAGE (LEAVE EMPTY FOR THE DEFAULT)"
            value={form.hero_image_url}
            folder="home"
            onChange={(url) => update("hero_image_url", url)}
          />
          <div className="field">
            <label className="label" htmlFor="t-hero">
              TEXT ON THE IMAGE (PRESS ENTER FOR A NEW LINE)
            </label>
            <textarea
              id="t-hero"
              className="input"
              rows={3}
              value={form.hero_text}
              onChange={(e) => update("hero_text", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="t-pill">
              LABEL ON THE IMAGE (SMALL PILL)
            </label>
            <input
              id="t-pill"
              className="input"
              value={form.pill_text}
              onChange={(e) => update("pill_text", e.target.value)}
              placeholder="Leave empty to use the tab name"
              disabled={form.pill_shows_event}
            />
            <label className="check" style={{ marginTop: 10 }}>
              <input
                type="checkbox"
                checked={form.pill_shows_event}
                onChange={(e) => update("pill_shows_event", e.target.checked)}
              />
              SHOW THE FLAGSHIP EVENT'S NAME INSTEAD
            </label>
          </div>
          <div className="field">
            <label className="label" htmlFor="t-action">
              BUTTON TEXT
            </label>
            <input
              id="t-action"
              className="input"
              value={form.action_label}
              onChange={(e) => update("action_label", e.target.value)}
              placeholder="EXPLORE EVENTS"
            />
          </div>
          <TargetField
            label="BUTTON GOES TO"
            value={form.action_target}
            onChange={(v) => update("action_target", v)}
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