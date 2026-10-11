import { useCallback, useEffect, useState } from "react";
import Drawer from "../components/Drawer";
import { useEventScope } from "../events/EventScope";
import { supabase } from "../lib/supabase";
import type { AdminEventVendor } from "../lib/types";

type Option = {
  id: string;
  name: string;
  booth: string | null;
  logo_url: string | null;
};

type EditState = {
  vendor_id: string;
  name: string;
  booth: string;
  is_sponsor: boolean;
};

export default function Marketplace() {
  const { event, eventId } = useEventScope();
  const [rows, setRows] = useState<AdminEventVendor[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const [r, v] = await Promise.all([
      supabase
        .from("event_vendors")
        .select("*, vendors(id, name, slug, logo_url, category, is_published)")
        .eq("event_id", eventId)
        .order("sort_order"),
      supabase
        .from("vendors")
        .select("id, name, booth, logo_url")
        .order("name"),
    ]);
    if (r.error) setError(r.error.message);
    else {
      setRows(r.data as unknown as AdminEventVendor[]);
      setError(null);
    }
    if (v.data) setOptions(v.data as Option[]);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const available = options.filter(
    (o) => !rows.some((r) => r.vendor_id === o.id),
  );

  async function addSelected() {
    if (!eventId || picked.length === 0) return;
    setSaving(true);
    setFormError(null);
    const inserts = picked.map((id, i) => ({
      event_id: eventId,
      vendor_id: id,
      // start from the vendor's usual booth; change it per event afterwards
      booth: options.find((o) => o.id === id)?.booth ?? null,
      sort_order: rows.length + i,
    }));
    const { error } = await supabase.from("event_vendors").insert(inserts);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setAdding(false);
    setPicked([]);
    load();
  }

  async function saveEdit() {
    if (!eventId || !editing) return;
    setSaving(true);
    setFormError(null);
    const { error } = await supabase
      .from("event_vendors")
      .update({
        booth: editing.booth.trim() || null,
        is_sponsor: editing.is_sponsor,
      })
      .eq("event_id", eventId)
      .eq("vendor_id", editing.vendor_id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setEditing(null);
    load();
  }

  async function removeFromEvent() {
    if (!eventId || !editing) return;
    const ok = window.confirm(
      `Remove ${editing.name} from ${event?.title ?? "this event"}? The vendor itself isn't deleted.`,
    );
    if (!ok) return;
    setSaving(true);
    const { error } = await supabase
      .from("event_vendors")
      .delete()
      .eq("event_id", eventId)
      .eq("vendor_id", editing.vendor_id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setEditing(null);
    load();
  }

  async function toggleSponsor(row: AdminEventVendor) {
    if (!eventId) return;
    const { error } = await supabase
      .from("event_vendors")
      .update({ is_sponsor: !row.is_sponsor })
      .eq("event_id", eventId)
      .eq("vendor_id", row.vendor_id);
    if (error) setError(error.message);
    else load();
  }

  // swap two neighbours, then renumber so the order is always 0,1,2...
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (!eventId || target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    const results = await Promise.all(
      next.map((r, i) =>
        r.sort_order === i
          ? Promise.resolve({ error: null })
          : supabase
              .from("event_vendors")
              .update({ sort_order: i })
              .eq("event_id", eventId)
              .eq("vendor_id", r.vendor_id),
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
          <p className="kicker">THIS EVENT</p>
          <h1 className="display">MARKETPLACE</h1>
        </div>
        <button
          className="btn"
          disabled={!eventId}
          onClick={() => {
            setPicked([]);
            setFormError(null);
            setAdding(true);
          }}
        >
          + ADD VENDORS
        </button>
      </div>
      <p className="muted small" style={{ marginBottom: 20 }}>
        {event ? (
          <>
            The vendors attending <strong>{event.title}</strong>. This is what
            its Marketplace tab shows in the app. Booth and sponsor are set per
            event.
          </>
        ) : (
          "Create an event first."
        )}
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
                <th>VENDOR</th>
                <th>BOOTH</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.vendor_id}>
                  <td>
                    <div className="move">
                      <button onClick={() => move(i, -1)} disabled={i === 0}>
                        ▲
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === rows.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td>
                    {r.vendors?.logo_url ? (
                      <img src={r.vendors.logo_url} alt="" className="thumb" />
                    ) : (
                      <div className="thumb empty">
                        {r.vendors?.name.charAt(0) ?? "?"}
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{r.vendors?.name ?? "Unknown vendor"}</strong>
                    <div className="muted small">{r.vendors?.category}</div>
                  </td>
                  <td>{r.booth ?? "–"}</td>
                  <td>
                    <button
                      className={`badge ${r.is_sponsor ? "on" : "off"}`}
                      onClick={() => toggleSponsor(r)}
                      title="Click to toggle"
                    >
                      {r.is_sponsor ? "SPONSOR" : "NOT SPONSOR"}
                    </button>
                    {r.vendors && !r.vendors.is_published && (
                      <span className="badge" title="Publish it on the Vendors page">
                        VENDOR HIDDEN
                      </span>
                    )}
                  </td>
                  <td className="right">
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setFormError(null);
                        setEditing({
                          vendor_id: r.vendor_id,
                          name: r.vendors?.name ?? "this vendor",
                          booth: r.booth ?? "",
                          is_sponsor: r.is_sponsor,
                        });
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted center">
                    No vendors at this event yet. Use + ADD VENDORS.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <Drawer
          title="ADD VENDORS"
          saving={saving}
          error={formError}
          canDelete={false}
          onClose={() => setAdding(false)}
          onSubmit={addSelected}
          onDelete={() => undefined}
        >
          {available.length === 0 ? (
            <p className="muted">
              Every vendor is already at this event. Create new ones on the
              Vendors page.
            </p>
          ) : (
            available.map((o) => (
              <label key={o.id} className="check">
                <input
                  type="checkbox"
                  checked={picked.includes(o.id)}
                  onChange={(e) =>
                    setPicked((cur) =>
                      e.target.checked
                        ? [...cur, o.id]
                        : cur.filter((id) => id !== o.id),
                    )
                  }
                />
                {o.name}
                {o.booth ? ` (${o.booth})` : ""}
              </label>
            ))
          )}
        </Drawer>
      )}

      {editing && (
        <Drawer
          title={`EDIT ${editing.name.toUpperCase()}`}
          saving={saving}
          error={formError}
          canDelete
          deleteLabel="REMOVE FROM EVENT"
          onClose={() => setEditing(null)}
          onSubmit={saveEdit}
          onDelete={removeFromEvent}
        >
          <div className="field">
            <label className="label" htmlFor="m-booth">
              BOOTH AT THIS EVENT
            </label>
            <input
              id="m-booth"
              className="input"
              value={editing.booth}
              onChange={(e) => setEditing({ ...editing, booth: e.target.value })}
              placeholder="B-12"
            />
          </div>
          <div className="field checks">
            <label className="check">
              <input
                type="checkbox"
                checked={editing.is_sponsor}
                onChange={(e) =>
                  setEditing({ ...editing, is_sponsor: e.target.checked })
                }
              />
              SPONSOR OF THIS EVENT
            </label>
          </div>
        </Drawer>
      )}
    </>
  );
}