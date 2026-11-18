import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ApprovedApplication = {
  id: string;
  event_id: string;
  brand_name: string;
  logo_url: string;
  description: string;
  showcase_products: { name: string; image_url: string }[];
  booth: string | null;
  created_at: string;
};

export default function Marketplace() {
  const [applications, setApplications] = useState<ApprovedApplication[]>([]);
  const [booths, setBooths] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .ilike("title", "STREET SOUK CONVENTION")
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (eventError || !event) {
      setApplications([]);
      setError(eventError?.message ?? "STREET SOUK CONVENTION was not found in Events.");
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from("event_vendor_applications")
      .select("id, event_id, brand_name, logo_url, description, showcase_products, booth, created_at")
      .eq("event_id", event.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    if (loadError) {
      setError(loadError.message);
    } else {
      const rows = (data ?? []) as ApprovedApplication[];
      setApplications(rows);
      setBooths(Object.fromEntries(rows.map((row) => [row.id, row.booth ?? ""])));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveBooth(application: ApprovedApplication) {
    setSavingId(application.id);
    setSavedId(null);
    setError(null);
    const booth = booths[application.id]?.trim() || null;
    const { error: saveError } = await supabase
      .from("event_vendor_applications")
      .update({ booth })
      .eq("id", application.id)
      .eq("event_id", application.event_id)
      .eq("status", "approved");
    if (saveError) {
      setError(saveError.message);
    } else {
      setApplications((current) => current.map((row) => row.id === application.id ? { ...row, booth } : row));
      setSavedId(application.id);
    }
    setSavingId(null);
  }

  async function removeFromEvent(application: ApprovedApplication) {
    const confirmed = window.confirm(
      `Remove ${application.brand_name} from STREET SOUK CONVENTION? The application will be kept and can be restored later.`,
    );
    if (!confirmed) return;
    setSavingId(application.id);
    setError(null);
    const { error: removeError } = await supabase
      .from("event_vendor_applications")
      .update({ status: "removed" })
      .eq("id", application.id)
      .eq("event_id", application.event_id)
      .eq("status", "approved");
    if (removeError) {
      setError(removeError.message);
    } else {
      setApplications((current) => current.filter((row) => row.id !== application.id));
      setBooths((current) => {
        const next = { ...current };
        delete next[application.id];
        return next;
      });
    }
    setSavingId(null);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">APPROVED APPLICATIONS</p>
          <h1 className="display">MARKETPLACE</h1>
        </div>
        <button className="btn ghost small" onClick={() => void load()} disabled={loading}>
          REFRESH
        </button>
      </div>

      <p className="muted small" style={{ marginBottom: 20 }}>
        Approved vendor applications for STREET SOUK CONVENTION. Assign a booth number here; only approved applications are listed.
      </p>

      {error && <p className="error">Could not load or save marketplace vendors: {error}</p>}
      {loading ? (
        <div className="spinner" />
      ) : applications.length === 0 ? (
        <p className="muted">
          No approved vendor applications for this event yet. Review applications in Vendor Applications first.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>BRAND</th>
                <th>SHOWCASE PRODUCTS</th>
                <th>BOOTH</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <div className="marketplace-approved-brand">
                      <img src={application.logo_url} alt="" className="thumb" />
                      <div>
                        <strong>{application.brand_name}</strong>
                        <p className="muted small marketplace-approved-description">{application.description}</p>
                      </div>
                    </div>
                  </td>
                  <td>{application.showcase_products?.length ?? 0} products</td>
                  <td>
                    <input
                      className="input marketplace-booth-input"
                      aria-label={`Booth for ${application.brand_name}`}
                      placeholder="e.g. A12"
                      maxLength={30}
                      value={booths[application.id] ?? ""}
                      onChange={(input) => {
                        setSavedId(null);
                        setBooths((current) => ({ ...current, [application.id]: input.target.value }));
                      }}
                    />
                  </td>
                  <td>
                    <div className="marketplace-actions">
                      <button
                        className="btn small"
                        onClick={() => void saveBooth(application)}
                        disabled={savingId === application.id || booths[application.id] === (application.booth ?? "")}
                      >
                        {savingId === application.id ? "SAVING…" : savedId === application.id ? "SAVED" : "SAVE BOOTH"}
                      </button>
                      <button
                        className="btn ghost danger small"
                        onClick={() => void removeFromEvent(application)}
                        disabled={savingId === application.id}
                      >
                        REMOVE
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
