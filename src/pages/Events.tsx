import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Drawer from "../components/Drawer";
import ImageUpload from "../components/ImageUpload";
import { useEventScope } from "../events/EventScope";
import { slugify } from "../lib/slug";
import { supabase } from "../lib/supabase";
import type { AdminEvent } from "../lib/types";
import { isPastEvent } from "../lib/eventDates";

type FormState = {
  id: string | null;
  slug: string;
  title: string;
  badge: string;
  location: string;
  date_label: string;
  description: string;
  cover_url: string | null;
  is_published: boolean;
  starts_on: string;
  ends_on: string;
};

const blank: FormState = {
  id: null,
  slug: "",
  title: "",
  badge: "STREET SOUK PRESENTS",
  location: "LAGOS, NIGERIA",
  date_label: "DATE TBA",
  starts_on: "",
  ends_on: "",
  description: "",
  cover_url: null,
  is_published: true,
};

function toForm(e: AdminEvent): FormState {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    badge: e.badge ?? "",
    location: e.location ?? "",
    date_label: e.date_label ?? "",
    description: e.description ?? "",
    cover_url: e.cover_url,
    is_published: e.is_published,
    starts_on: e.starts_on ?? "",
    ends_on: e.ends_on ?? "",
  };
}

export default function Events() {
  const navigate = useNavigate();
  const { events, loading, reload, setEventId } = useEventScope();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!form) return;
    if (!form.title.trim() || !form.slug.trim()) {
      setFormError("Title and slug are required.");
      return;
    }
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on) {
      setFormError("The end date can't be before the start date.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      badge: form.badge.trim() || null,
      location: form.location.trim() || null,
      date_label: form.date_label.trim() || null,
      description: form.description.trim() || null,
      cover_url: form.cover_url,
      starts_on: form.starts_on || null,
      ends_on: form.ends_on || null,
      is_published: form.is_published,
    };

    let failure: string | null = null;
    if (form.id) {
      const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", form.id);
      if (error) failure = error.message;
    } else {
      const { data, error } = await supabase
        .from("events")
        .insert({ ...payload, sort_order: events.length })
        .select("id")
        .single();
      if (error) failure = error.message;
      else if (data) setEventId(data.id); // jump to the new event
    }
    setSaving(false);

    if (failure) {
      setFormError(
        failure.includes("duplicate key")
          ? "That slug is already used by another event."
          : failure,
      );
      return;
    }
    setForm(null);
    await reload();
  }

  async function remove() {
    if (!form?.id) return;
    const ok = window.confirm(
      `Delete ${form.title}? This also deletes its schedule, lineup and FAQs. This can't be undone.`,
    );
    if (!ok) return;
    setSaving(true);
    const { error } = await supabase.from("events").delete().eq("id", form.id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    await reload();
  }

  async function togglePublished(event: AdminEvent) {
    const { error } = await supabase
      .from("events")
      .update({ is_published: !event.is_published })
      .eq("id", event.id);
    if (error) setError(error.message);
    else await reload();
  }

  // swap two neighbours, then renumber so the order is always 0,1,2...
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= events.length) return;
    const next = [...events];
    [next[index], next[target]] = [next[target], next[index]];
    const results = await Promise.all(
      next.map((ev, i) =>
        ev.sort_order === i
          ? Promise.resolve({ error: null })
          : supabase.from("events").update({ sort_order: i }).eq("id", ev.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) setError(failed.error.message);
    await reload();
  }
  const flagshipId = events.find((e) => !isPastEvent(e))?.id;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">CONTENT</p>
          <h1 className="display">EVENTS</h1>
        </div>
        <button
          className="btn"
          onClick={() => {
            setForm({ ...blank });
            setSlugTouched(false);
            setFormError(null);
          }}
        >
          + NEW EVENT
        </button>
      </div>

      <p className="muted small" style={{ marginBottom: 20 }}>
        The event at the top of this list is the flagship: it's the one shown on
        the app's Home screen. Use the arrows to reorder.
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
                <th />
                <th>EVENT</th>
                <th>WHERE / WHEN</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((ev, i) => (
                <tr key={ev.id}>
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
                        disabled={i === events.length - 1}
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td>
                    {ev.cover_url ? (
                      <img src={ev.cover_url} alt="" className="thumb" />
                    ) : (
                      <div className="thumb empty">{ev.title.charAt(0)}</div>
                    )}
                  </td>
                  <td>
                    <strong>{ev.title}</strong>
                    <div className="muted small">/{ev.slug}</div>
                  </td>
                  <td>
                    {ev.location ?? "–"}
                    <div className="muted small">{ev.date_label ?? "–"}</div>
                  </td>
                  <td>
                    <button
                      className={`badge ${ev.is_published ? "on" : "off"}`}
                      onClick={() => togglePublished(ev)}
                      title="Click to toggle"
                    >
                      {ev.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                    {ev.id === flagshipId && (
                      <span className="badge sponsor">FLAGSHIP</span>
                    )}
                    {isPastEvent(ev) && <span className="badge">PAST</span>}
                  </td>
                  <td className="right">
                    <button
                      className="btn small ghost"
                      style={{ marginRight: 8 }}
                      onClick={() => {
                        setEventId(ev.id);
                        navigate("/schedule");
                      }}
                    >
                      CONTENT
                    </button>
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setForm(toForm(ev));
                        setSlugTouched(true);
                        setFormError(null);
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted center">
                    No events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT EVENT" : "NEW EVENT"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="e-title">
              TITLE
            </label>
            <input
              id="e-title"
              className="input"
              value={form.title}
              onChange={(e) => {
                update("title", e.target.value);
                if (!slugTouched) update("slug", slugify(e.target.value));
              }}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="e-slug">
              SLUG (used in links; fixed once saved)
            </label>
            <input
              id="e-slug"
              className="input mono"
              value={form.slug}
              disabled={!!form.id}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", slugify(e.target.value));
              }}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="e-badge">
              BADGE (SMALL LABEL ON THE CARD)
            </label>
            <input
              id="e-badge"
              className="input"
              value={form.badge}
              onChange={(e) => update("badge", e.target.value)}
              placeholder="STREET SOUK PRESENTS"
            />
          </div>
          <div className="row2">
            <div className="field">
              <label className="label" htmlFor="e-loc">
                LOCATION
              </label>
              <input
                id="e-loc"
                className="input"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="e-date">
                DATE (TEXT)
              </label>
              <input
                id="e-date"
                className="input"
                value={form.date_label}
                onChange={(e) => update("date_label", e.target.value)}
                placeholder="DEC 15 – 17, 2026"
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label className="label" htmlFor="e-start">
                STARTS ON
              </label>
              <input
                id="e-start"
                className="input"
                type="date"
                value={form.starts_on}
                onChange={(e) => update("starts_on", e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="e-end">
                ENDS ON (OPTIONAL)
              </label>
              <input
                id="e-end"
                className="input"
                type="date"
                value={form.ends_on}
                onChange={(e) => update("ends_on", e.target.value)}
              />
            </div>
          </div>
          <p className="muted small">
            The date text above is what people see. These two dates only decide
            when the app marks the event as past, the day after it ends. Leave
            them empty while the date is TBA.
          </p>
          <div className="field">
            <label className="label" htmlFor="e-desc">
              DESCRIPTION (SHOWN ON THE EVENT PAGE)
            </label>
            <textarea
              id="e-desc"
              className="input"
              rows={5}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
          <ImageUpload
            label="COVER IMAGE"
            value={form.cover_url}
            folder={`events/${form.slug || "new"}`}
            disabled={!form.slug}
            onChange={(url) => update("cover_url", url)}
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
