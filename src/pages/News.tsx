import { useCallback, useEffect, useState } from "react";
import Drawer from "../components/Drawer";
import ImageUpload from "../components/ImageUpload";
import { supabase } from "../lib/supabase";
import type { AdminNews } from "../lib/types";

type FormState = {
  id: string | null;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  video_url: string;
  topic_id: string;
  published_at: string; // datetime-local format
  is_published: boolean;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blank(): FormState {
  return {
    id: null,
    title: "",
    excerpt: "",
    body: "",
    cover_url: null,
    video_url: "",
    topic_id: "",
    published_at: toLocalInput(new Date().toISOString()),
    is_published: true,
  };
}

function toForm(n: AdminNews): FormState {
  return {
    id: n.id,
    title: n.title,
    excerpt: n.excerpt ?? "",
    body: n.body ?? "",
    cover_url: n.cover_url,
    video_url: n.video_url ?? "",
    topic_id: n.topic_id ?? "",
    published_at: toLocalInput(n.published_at),
    is_published: n.is_published,
  };
}

export default function News() {
  const [posts, setPosts] = useState<AdminNews[]>([]);
  const [topics, setTopics] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [n, t] = await Promise.all([
      supabase
        .from("news")
        .select("*, home_tabs(label)")
        .order("published_at", { ascending: false }),
      supabase.from("home_tabs").select("id, label").order("sort_order"),
    ]);
    if (n.error) setError(n.error.message);
    else {
      setPosts(n.data as unknown as AdminNews[]);
      setError(null);
    }
    if (t.data) setTopics(t.data as { id: string; label: string }[]);
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
    if (!form.title.trim()) {
      setFormError("A title is required.");
      return;
    }
    if (form.video_url.trim() && !/^https?:\/\//i.test(form.video_url.trim())) {
      setFormError("The video link must start with https://");
      return;
    }
    setSaving(true);
    setFormError(null);
    const when = new Date(form.published_at);
    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      body: form.body.trim() || null,
      cover_url: form.cover_url,
      video_url: form.video_url.trim() || null,
      topic_id: form.topic_id || null,
      published_at: (isNaN(when.getTime()) ? new Date() : when).toISOString(),
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("news").update(payload).eq("id", form.id)
      : await supabase.from("news").insert(payload);
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
    if (!window.confirm(`Delete "${form.title}"? This can't be undone.`)) return;
    setSaving(true);
    const { error } = await supabase.from("news").delete().eq("id", form.id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    load();
  }

  async function togglePublished(post: AdminNews) {
    const { error } = await supabase
      .from("news")
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
          <h1 className="display">NEWS (SS TV)</h1>
        </div>
        <button
          className="btn"
          onClick={() => {
            setForm(blank());
            setFormError(null);
          }}
        >
          + NEW STORY
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
                <th />
                <th>STORY</th>
                <th>TOPIC</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="" className="thumb" />
                    ) : (
                      <div className="thumb empty">{p.title.charAt(0)}</div>
                    )}
                  </td>
                  <td style={{ maxWidth: 360 }}>
                    <strong>{p.title}</strong>
                    {p.excerpt && (
                      <div className="muted small">
                        {p.excerpt.length > 90
                          ? `${p.excerpt.slice(0, 90)}…`
                          : p.excerpt}
                      </div>
                    )}
                  </td>
                  <td>{p.home_tabs?.label ?? "–"}</td>
                  <td className="muted small">
                    {new Date(p.published_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className={`badge ${p.is_published ? "on" : "off"}`}
                      onClick={() => togglePublished(p)}
                      title="Click to toggle"
                    >
                      {p.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                    {p.video_url && <span className="badge">VIDEO</span>}
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
                  <td colSpan={6} className="muted center">
                    No stories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT STORY" : "NEW STORY"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="n-title">
              TITLE
            </label>
            <input
              id="n-title"
              className="input"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>
          <ImageUpload
            label="COVER IMAGE"
            value={form.cover_url}
            folder="news"
            onChange={(url) => update("cover_url", url)}
          />
          <div className="field">
            <label className="label" htmlFor="n-excerpt">
              SHORT SUMMARY (SHOWN ON THE CARD)
            </label>
            <textarea
              id="n-excerpt"
              className="input"
              rows={2}
              value={form.excerpt}
              onChange={(e) => update("excerpt", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="n-body">
              STORY (LEAVE A BLANK LINE BETWEEN PARAGRAPHS)
            </label>
            <textarea
              id="n-body"
              className="input"
              rows={10}
              value={form.body}
              onChange={(e) => update("body", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="n-video">
              VIDEO LINK (OPTIONAL, E.G. YOUTUBE)
            </label>
            <input
              id="n-video"
              className="input"
              value={form.video_url}
              onChange={(e) => update("video_url", e.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="row2">
            <div className="field">
              <label className="label" htmlFor="n-topic">
                TOPIC
              </label>
              <select
                id="n-topic"
                className="input"
                value={form.topic_id}
                onChange={(e) => update("topic_id", e.target.value)}
              >
                <option value="">No topic (FOR YOU only)</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="n-date">
                DATE
              </label>
              <input
                id="n-date"
                className="input"
                type="datetime-local"
                value={form.published_at}
                onChange={(e) => update("published_at", e.target.value)}
              />
            </div>
          </div>
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