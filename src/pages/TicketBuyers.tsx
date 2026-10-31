import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type TicketBuyerRow = {
  id: string;
  reference: string;
  event_name: string;
  event_slug: string;
  ticket_name: string | null;
  quantity: number;
  formatted_amount: string | null;
  attendee_first_name: string | null;
  attendee_last_name: string | null;
  attendee_email: string | null;
  attendee_phone: string | null;
  paid_at: string | null;
  received_at: string;
};

function displayDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function TicketBuyers() {
  const [rows, setRows] = useState<TicketBuyerRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("ticket_attendees")
      .select(
        "id, reference, event_name, event_slug, ticket_name, quantity, formatted_amount, attendee_first_name, attendee_last_name, attendee_email, attendee_phone, paid_at, received_at",
      )
      .order("received_at", { ascending: false })
      .limit(1000);

    if (loadError) {
      setError(loadError.message);
    } else {
      setRows((data ?? []) as TicketBuyerRow[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [
        row.attendee_first_name,
        row.attendee_last_name,
        row.attendee_email,
        row.attendee_phone,
        row.event_name,
        row.event_slug,
        row.ticket_name,
        row.reference,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [rows, query]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">TICKETING</p>
          <h1 className="display">TICKET BUYERS</h1>
        </div>
        <button className="btn ghost small" onClick={() => void load()} disabled={loading}>
          REFRESH
        </button>
      </div>

      <div className="cards" style={{ marginBottom: 22 }}>
        <div className="card">
          <span className="card-value">{rows.length}</span>
          <span className="kicker">ATTENDEES RECORDED</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <input
          className="input"
          aria-label="Search ticket buyers"
          placeholder="Search name, email, event, ticket or reference"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ maxWidth: 540 }}
        />
        <span className="kicker" style={{ whiteSpace: "nowrap" }}>
          {filtered.length} SHOWN
        </span>
      </div>

      {error && <p className="error">Could not load ticket buyers: {error}</p>}
      {loading && rows.length === 0 && <div className="spinner" />}
      {!loading && !error && filtered.length === 0 && (
        <p className="muted">
          {rows.length === 0
            ? "No ticket purchases have been received yet. New purchases will appear here after Jetron webhooks are connected."
            : "No buyers match that search."}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ATTENDEE</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>EVENT</th>
                <th>TICKET</th>
                <th>QTY</th>
                <th>AMOUNT</th>
                <th>PAID / RECEIVED</th>
                <th>REFERENCE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const name = [row.attendee_first_name, row.attendee_last_name]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <tr key={row.id}>
                    <td>{name || "Name unavailable"}</td>
                    <td>{row.attendee_email || "-"}</td>
                    <td>{row.attendee_phone || "-"}</td>
                    <td>{row.event_name || row.event_slug}</td>
                    <td>{row.ticket_name || "Ticket"}</td>
                    <td>{row.quantity}</td>
                    <td>{row.formatted_amount || "-"}</td>
                    <td>{displayDate(row.paid_at || row.received_at)}</td>
                    <td className="mono small">{row.reference}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}