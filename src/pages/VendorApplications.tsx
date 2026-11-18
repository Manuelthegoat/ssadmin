import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type ApplicationStatus = "pending" | "approved" | "rejected" | "removed";
type ShowcaseProduct = { name: string; image_url: string };
type VendorApplication = {
  id: string;
  event_id: string;
  brand_name: string;
  description: string;
  logo_url: string;
  campaign_image_url: string;
  showcase_products: ShowcaseProduct[];
  status: ApplicationStatus;
  created_at: string;
};

const statuses: ApplicationStatus[] = ["pending", "approved", "removed", "rejected"];

function submittedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

export default function VendorApplications() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [status, setStatus] = useState<ApplicationStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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

    const { data, error: applicationError } = await supabase
      .from("event_vendor_applications")
      .select("id, event_id, brand_name, description, logo_url, campaign_image_url, showcase_products, status, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false });
    if (applicationError) {
      setApplications([]);
      setError(applicationError.message);
    } else {
      setApplications((data ?? []) as VendorApplication[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => applications.filter((application) => application.status === status),
    [applications, status],
  );

  async function review(application: VendorApplication, nextStatus: "approved" | "rejected") {
    setUpdatingId(application.id);
    setError(null);
    const { error: updateError } = await supabase
      .from("event_vendor_applications")
      .update({ status: nextStatus })
      .eq("id", application.id)
      .eq("event_id", application.event_id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setApplications((current) => current.map((item) =>
        item.id === application.id ? { ...item, status: nextStatus } : item,
      ));
    }
    setUpdatingId(null);
  }

  const counts = statuses.reduce<Record<ApplicationStatus, number>>((result, item) => {
    result[item] = applications.filter((application) => application.status === item).length;
    return result;
  }, { pending: 0, approved: 0, removed: 0, rejected: 0 });

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">STREET SOUK CONVENTION</p>
          <h1 className="display">VENDOR APPLICATIONS</h1>
        </div>
        <button className="btn ghost small" onClick={() => void load()} disabled={loading}>
          REFRESH
        </button>
      </div>

      <div className="application-status-tabs" role="tablist" aria-label="Application status">
        {statuses.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={status === item}
            className={`badge${status === item ? " on" : ""}`}
            onClick={() => setStatus(item)}
          >
            {item.toUpperCase()} <span>{counts[item]}</span>
          </button>
        ))}
      </div>

      {error && <p className="error">Could not load or update applications: {error}</p>}
      {loading ? (
        <div className="spinner" />
      ) : visible.length === 0 ? (
        <p className="muted application-empty">
          {status === "pending" ? "No pending applications. New submissions will appear here." : `No ${status} applications.`}
        </p>
      ) : (
        <div className="application-list">
          {visible.map((application) => (
            <article className="application-card" key={application.id}>
              <div className="application-brand-row">
                <img className="application-logo" src={application.logo_url} alt={`${application.brand_name} logo`} />
                <div className="application-brand-copy">
                  <span className="kicker">SUBMITTED {submittedDate(application.created_at)}</span>
                  <h2>{application.brand_name}</h2>
                  <p>{application.description}</p>
                </div>
              </div>
              <img className="application-campaign" src={application.campaign_image_url} alt={`${application.brand_name} campaign`} />
              <div className="application-products-head">
                <strong>SHOWCASE PRODUCTS</strong>
                <span>{application.showcase_products?.length ?? 0} ITEMS</span>
              </div>
              <div className="application-products">
                {(application.showcase_products ?? []).map((product, index) => (
                  <div className="application-product" key={`${product.name}-${index}`}>
                    <img src={product.image_url} alt="" />
                    <span>{product.name}</span>
                  </div>
                ))}
              </div>
            {status === "pending" && (
                <div className="application-actions">
                  <button
                    className="btn"
                    onClick={() => void review(application, "approved")}
                    disabled={updatingId === application.id}
                  >
                    {updatingId === application.id ? "SAVING…" : "APPROVE"}
                  </button>
                  <button
                    className="btn ghost danger"
                    onClick={() => void review(application, "rejected")}
                    disabled={updatingId === application.id}
                  >
                    REJECT
                  </button>
                </div>
              )}
              {status === "removed" && (
                <div className="application-actions">
                  <button
                    className="btn"
                    onClick={() => void review(application, "approved")}
                    disabled={updatingId === application.id}
                  >
                    {updatingId === application.id ? "SAVING…" : "RESTORE TO MARKETPLACE"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
