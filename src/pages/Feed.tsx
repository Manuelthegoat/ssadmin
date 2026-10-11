import { useCallback, useEffect, useState } from "react";
import Drawer from "../components/Drawer";
import { supabase } from "../lib/supabase";
import type { AdminFeedPost } from "../lib/types";
import { useEventScope } from "../events/EventScope";

const CATEGORIES = ["DROPS", "SCHEDULE", "CROWD", "INFO"] as const;

type FormState = {
  id: string | null;
  category: AdminFeedPost["category"];
  title: string;
  detail: string;
  is_urgent: boolean;
  is_live: boolean;
  is_sold_out: boolean;
  is_published: boolean;
};

const blank: FormState = {
  id: null,
  category: "INFO",
  title: "",
  detail: "",
  is_urgent: false,
  is_live: false,
  is_sold_out: false,
  is_published: true,
};

function toForm(p: AdminFeedPost): FormState {
  return {
    id: p.id,
    category: p.category,
    title: p.title,
    detail: p.detail,
    is_urgent: p.is_urgent,
    is_live: p.is_live,
    is_sold_out: p.is_sold_out,
    is_published: p.is_published,
  };
}

export default function Feed() {
  const { eventId } = useEventScope();
  const [posts, setPosts] = useState<AdminFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setPosts([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("feed_posts")
      .select("*")
      .eq("event_id", eventId)
      .order("published_at", { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    else {
      setPosts(data as AdminFeedPost[]);
      setError(null);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!form) return;
    if (!eventId) { setFormError("Create an event first."); return; }
    if (!form.title.trim() || !form.detail.trim()) {
      setFormError("Title and details are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      event_id: eventId,
      category: form.category,
      title: form.title.trim(),
      detail: form.detail.trim(),
      is_urgent: form.is_urgent,
      is_live: form.is_live,
      is_sold_out: form.is_sold_out,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("feed_posts").update(payload).eq("id", form.id)
      : await supabase.from("feed_posts").insert(payload);
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
    if (!window.confirm("Delete this post? It disappears from phones immediately.")) return;
    setSaving(true);
    const { error } = await supabase.from("feed_posts").delete().eq("id", form.id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    load();
  }

  async function togglePublished(post: AdminFeedPost) {
    const { error } = await supabase
      .from("feed_posts")
      .update({ is_published: !post.is_published })
      .eq("id", post.id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">CONTENT</p>
          <h1 className="display">LIVE FEED</h1>
        </div>
        <button
          className="btn"
          onClick={() => {
            setForm({ ...blank });
            setFormError(null);
          }}
        >
          + NEW POST
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>POSTED</th>
                <th>POST</th>
                <th>TYPE</th>
                <th>FLAGS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className="muted small">
                    {new Date(p.published_at).toLocaleString()}
                  </td>
                  <td style={{ maxWidth: 380 }}>
                    <strong>{p.title}</strong>
                    <div className="muted small">{p.detail}</div>
                  </td>
                  <td>{p.category}</td>
                  <td>
                    <button
                      className={`badge ${p.is_published ? "on" : "off"}`}
                      onClick={() => togglePublished(p)}
                      title="Click to toggle"
                    >
                      {p.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                    {p.is_urgent && <span className="badge sponsor">URGENT</span>}
                    {p.is_live && <span className="badge on">LIVE</span>}
                    {p.is_sold_out && <span className="badge">SOLD OUT</span>}
                  </td>
                  <td className="right">
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setForm(toForm(p));
                        setFormError(null);
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted center">
                    No posts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT POST" : "NEW POST"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="f-cat">
              TYPE
            </label>
            <select
              id="f-cat"
              className="input"
              value={form.category}
              onChange={(e) =>
                update("category", e.target.value as FormState["category"])
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="f-title">
              TITLE
            </label>
            <input
              id="f-title"
              className="input"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="TEE DROP AT BOOTH 42"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="f-detail">
              DETAILS
            </label>
            <textarea
              id="f-detail"
              className="input"
              rows={5}
              value={form.detail}
              onChange={(e) => update("detail", e.target.value)}
            />
          </div>
          <div className="field checks">
            <label className="check">
              <input
                type="checkbox"
                checked={form.is_urgent}
                onChange={(e) => update("is_urgent", e.target.checked)}
              />
              URGENT / FLASH DROP
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.is_live}
                onChange={(e) => update("is_live", e.target.checked)}
              />
              HAPPENING NOW
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.is_sold_out}
                onChange={(e) => update("is_sold_out", e.target.checked)}
              />
              SOLD OUT
            </label>
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