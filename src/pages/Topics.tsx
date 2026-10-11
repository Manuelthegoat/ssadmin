import { useCallback, useEffect, useState } from "react";
import Drawer from "../components/Drawer";
import { reorder } from "../lib/reorder";
import { supabase } from "../lib/supabase";
import type { AdminTopic } from "../lib/types";

type FormState = { id: string | null; label: string; is_published: boolean };
const blank: FormState = { id: null, label: "", is_published: true };

export default function Topics() {
  const [topics, setTopics] = useState<AdminTopic[]>([]);
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
      setTopics(data as AdminTopic[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!form) return;
    if (!form.label.trim()) {
      setFormError("A name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = { label: form.label.trim(), is_published: form.is_published };
    const { error } = form.id
      ? await supabase.from("home_tabs").update(payload).eq("id", form.id)
      : await supabase
          .from("home_tabs")
          .insert({ ...payload, sort_order: topics.length });
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
    const ok = window.confirm(
      `Delete the ${form.label} topic? Items tagged with it stay, but lose the tag.`,
    );
    if (!ok) return;
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

  async function togglePublished(topic: AdminTopic) {
    const { error } = await supabase
      .from("home_tabs")
      .update({ is_published: !topic.is_published })
      .eq("id", topic.id);
    if (error) setError(error.message);
    else load();
  }

  async function move(index: number, direction: -1 | 1) {
    const failure = await reorder("home_tabs", topics, index, direction);
    if (failure) setError(failure);
    load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">HOME SCREEN</p>
          <h1 className="display">TOPICS</h1>
        </div>
        <button
          className="btn"
          onClick={() => {
            setForm({ ...blank });
            setFormError(null);
          }}
        >
          + NEW TOPIC
        </button>
      </div>
      <p className="muted small" style={{ marginBottom: 20 }}>
        The filter tabs on the app's Home screen, after FOR YOU. Tag products
        and news with a topic and they show up under that tab. Items with no
        topic only appear under FOR YOU.
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
                <th>TOPIC</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {topics.map((t, i) => (
                <tr key={t.id}>
                  <td>
                    <div className="move">
                      <button onClick={() => move(i, -1)} disabled={i === 0}>
                        ▲
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === topics.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td>
                    <strong>{t.label}</strong>
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
                        setForm({
                          id: t.id,
                          label: t.label,
                          is_published: t.is_published,
                        });
                        setFormError(null);
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {topics.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted center">
                    No topics yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT TOPIC" : "NEW TOPIC"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="tp-label">
              NAME
            </label>
            <input
              id="tp-label"
              className="input"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="SNEAKERS"
            />
          </div>
          <div className="field checks">
            <label className="check">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) =>
                  setForm({ ...form, is_published: e.target.checked })
                }
              />
              PUBLISHED
            </label>
          </div>
        </Drawer>
      )}
    </>
  );
}