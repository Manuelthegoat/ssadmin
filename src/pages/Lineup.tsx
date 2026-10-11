import { useCallback, useEffect, useState } from "react";
import Drawer from "../components/Drawer";
import ImageUpload from "../components/ImageUpload";
import { supabase } from "../lib/supabase";
import type { AdminLineup } from "../lib/types";
import { useEventScope } from "../events/EventScope";

type FormState = {
  id: string | null;
  name: string;
  description: string;
  image_url: string | null;
  is_published: boolean;
};

const blank: FormState = {
  id: null,
  name: "",
  description: "",
  image_url: null,
  is_published: true,
};

export default function Lineup() {
  const { eventId } = useEventScope();
  const [artists, setArtists] = useState<AdminLineup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setArtists([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("lineup")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order");
    if (error) setError(error.message);
    else {
      setArtists(data as AdminLineup[]);
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
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase
          .from("lineup")
          .update(payload)
          .eq("id", form.id)
          .eq("event_id", eventId)
      : await supabase
          .from("lineup")
          .insert({ ...payload, event_id: eventId, sort_order: artists.length });
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
    if (!window.confirm(`Remove ${form.name} from the lineup?`)) return;
    setSaving(true);
    const { error } = await supabase
      .from("lineup")
      .delete()
      .eq("id", form.id)
      .eq("event_id", eventId);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    load();
  }

  async function togglePublished(artist: AdminLineup) {
    const { error } = await supabase
      .from("lineup")
      .update({ is_published: !artist.is_published })
      .eq("id", artist.id)
      .eq("event_id", eventId);
    if (error) setError(error.message);
    else load();
  }

  // swap two neighbours, then renumber so the order is always 0,1,2...
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= artists.length) return;
    const next = [...artists];
    [next[index], next[target]] = [next[target], next[index]];
    const results = await Promise.all(
      next.map((a, i) =>
        a.sort_order === i
          ? Promise.resolve({ error: null })
          : supabase
              .from("lineup")
              .update({ sort_order: i })
              .eq("id", a.id)
              .eq("event_id", eventId),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) setError(failed.error.message);
    load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">CONTENT</p>
          <h1 className="display">LINEUP</h1>
        </div>
        <button
          className="btn"
          onClick={() => {
            setForm({ ...blank });
            setFormError(null);
          }}
        >
          + ADD TO LINEUP
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
                <th>ORDER</th>
                <th />
                <th>NAME</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {artists.map((a, i) => (
                <tr key={a.id}>
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
                        disabled={i === artists.length - 1}
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td>
                    {a.image_url ? (
                      <img src={a.image_url} alt="" className="thumb" />
                    ) : (
                      <div className="thumb empty">{a.name.charAt(0)}</div>
                    )}
                  </td>
                  <td style={{ maxWidth: 420 }}>
                    <strong>{a.name}</strong>
                    {a.description && (
                      <div className="muted small">
                        {a.description.length > 110
                          ? `${a.description.slice(0, 110)}…`
                          : a.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      className={`badge ${a.is_published ? "on" : "off"}`}
                      onClick={() => togglePublished(a)}
                      title="Click to toggle"
                    >
                      {a.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                  </td>
                  <td className="right">
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setForm({
                          id: a.id,
                          name: a.name,
                          description: a.description ?? "",
                          image_url: a.image_url,
                          is_published: a.is_published,
                        });
                        setFormError(null);
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {artists.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted center">
                    Nobody on the lineup yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT LINEUP ENTRY" : "ADD TO LINEUP"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="l-name">
              NAME
            </label>
            <input
              id="l-name"
              className="input"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <ImageUpload
            label="PICTURE (PORTRAIT WORKS BEST)"
            value={form.image_url}
            folder="lineup"
            onChange={(url) => update("image_url", url)}
          />
          <div className="field">
            <label className="label" htmlFor="l-desc">
              DESCRIPTION
            </label>
            <textarea
              id="l-desc"
              className="input"
              rows={7}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
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
