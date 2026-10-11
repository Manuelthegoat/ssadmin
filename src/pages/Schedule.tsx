import { useCallback, useEffect, useState } from "react";
import Drawer from "../components/Drawer";
import ImageUpload from "../components/ImageUpload";
import { formatTime } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { AdminScheduleItem } from "../lib/types";
import { useEventScope } from "../events/EventScope";

const CATEGORIES = ["DROP", "STAGE", "DJ"] as const;

type FormState = {
  id: string | null;
  title: string;
  place: string;
  category: AdminScheduleItem["category"];
  day_number: number;
  day_label: string;
  start_time: string;
  end_time: string;
  image_url: string | null;
  is_live: boolean;
  is_published: boolean;
};

const blank: FormState = {
  id: null,
  title: "",
  place: "",
  category: "STAGE",
  day_number: 1,
  day_label: "",
  start_time: "12:00",
  end_time: "",
  image_url: null,
  is_live: false,
  is_published: true,
};

function toForm(i: AdminScheduleItem): FormState {
  return {
    id: i.id,
    title: i.title,
    place: i.place,
    category: i.category,
    day_number: i.day_number,
    day_label: i.day_label ?? "",
    start_time: i.start_time.slice(0, 5),
    end_time: i.end_time ? i.end_time.slice(0, 5) : "",
    image_url: i.image_url,
    is_live: i.is_live,
    is_published: i.is_published,
  };
}

export default function Schedule() {
    const { eventId } = useEventScope();
  const [items, setItems] = useState<AdminScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("schedule_items")
      .select("*")
      .eq("event_id", eventId)
      .order("day_number")
      .order("start_time");
    if (error) setError(error.message);
    else {
      setItems(data as AdminScheduleItem[]);
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
    if (!form.title.trim() || !form.place.trim() || !form.start_time) {
      setFormError("Title, place and start time are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      place: form.place.trim(),
      category: form.category,
      day_number: form.day_number,
      day_label: form.day_label.trim() || null,
      start_time: form.start_time,
      end_time: form.end_time || null,
      image_url: form.image_url,
      is_live: form.is_live,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("schedule_items").update(payload).eq("id", form.id)
      : await supabase.from("schedule_items").insert(payload);
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
    const { error } = await supabase
      .from("schedule_items")
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

  async function toggle(item: AdminScheduleItem, field: "is_live" | "is_published") {
    const { error } = await supabase
      .from("schedule_items")
      .update({ [field]: !item[field] })
      .eq("id", item.id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">CONTENT</p>
          <h1 className="display">SCHEDULE</h1>
        </div>
        <button
          className="btn"
          onClick={() => {
            setForm({ ...blank });
            setFormError(null);
          }}
        >
          + NEW ITEM
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
                <th>DAY</th>
                <th>TIME</th>
                <th>ITEM</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>DAY {i.day_number}</strong>
                    {i.day_label && (
                      <div className="muted small">{i.day_label}</div>
                    )}
                  </td>
                  <td>
                    {formatTime(i.start_time)}
                    {i.end_time && (
                      <div className="muted small">to {formatTime(i.end_time)}</div>
                    )}
                  </td>
                  <td>
                    <strong>{i.title}</strong>
                    <div className="muted small">{i.place}</div>
                  </td>
                  <td>{i.category}</td>
                  <td>
                    <button
                      className={`badge ${i.is_published ? "on" : "off"}`}
                      onClick={() => toggle(i, "is_published")}
                      title="Click to toggle"
                    >
                      {i.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                    <button
                      className={`badge ${i.is_live ? "on" : "off"}`}
                      onClick={() => toggle(i, "is_live")}
                      title="Click to toggle"
                    >
                      {i.is_live ? "LIVE NOW" : "NOT LIVE"}
                    </button>
                  </td>
                  <td className="right">
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setForm(toForm(i));
                        setFormError(null);
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted center">
                    Nothing scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT ITEM" : "NEW ITEM"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="s-title">
              TITLE
            </label>
            <input
              id="s-title"
              className="input"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="s-place">
              PLACE
            </label>
            <input
              id="s-place"
              className="input"
              value={form.place}
              onChange={(e) => update("place", e.target.value)}
              placeholder="MAIN STAGE"
            />
          </div>
          <div className="row2">
            <div className="field">
              <label className="label" htmlFor="s-cat">
                TYPE
              </label>
              <select
                id="s-cat"
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
              <label className="label" htmlFor="s-day">
                DAY NUMBER
              </label>
              <input
                id="s-day"
                className="input"
                type="number"
                min={1}
                value={form.day_number}
                onChange={(e) => update("day_number", Number(e.target.value) || 1)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="s-label">
              DAY LABEL (OPTIONAL)
            </label>
            <input
              id="s-label"
              className="input"
              value={form.day_label}
              onChange={(e) => update("day_label", e.target.value)}
              placeholder="SATURDAY 24TH"
            />
            <p className="muted small" style={{ marginTop: 6 }}>
              Shown next to the day heading in the app. Set it on at least one
              item per day.
            </p>
          </div>
          <div className="row2">
            <div className="field">
              <label className="label" htmlFor="s-start">
                STARTS
              </label>
              <input
                id="s-start"
                className="input"
                type="time"
                value={form.start_time}
                onChange={(e) => update("start_time", e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="s-end">
                ENDS (OPTIONAL)
              </label>
              <input
                id="s-end"
                className="input"
                type="time"
                value={form.end_time}
                onChange={(e) => update("end_time", e.target.value)}
              />
            </div>
          </div>
          <ImageUpload
            label="IMAGE (OPTIONAL)"
            value={form.image_url}
            folder="schedule"
            onChange={(url) => update("image_url", url)}
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
            <label className="check">
              <input
                type="checkbox"
                checked={form.is_live}
                onChange={(e) => update("is_live", e.target.checked)}
              />
              LIVE NOW
            </label>
          </div>
        </Drawer>
      )}
    </>
  );
}