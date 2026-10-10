import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const tables = [
  ["vendors", "Vendors"],
  ["products", "Products"],
  ["schedule_items", "Schedule items"],
  ["feed_posts", "Feed posts"],
  ["faqs", "FAQs"],
] as const;

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    Promise.all(
      tables.map(([table]) =>
        supabase.from(table).select("id", { count: "exact", head: true }),
      ),
    ).then((results) => {
      const next: Record<string, number> = {};
      results.forEach((r, i) => {
        next[tables[i][0]] = r.count ?? 0;
      });
      setCounts(next);
    });
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">OVERVIEW</p>
          <h1 className="display">DASHBOARD</h1>
        </div>
      </div>
      <div className="cards">
        {tables.map(([table, label]) => (
          <div key={table} className="card">
            <span className="card-value">{counts ? counts[table] : "–"}</span>
            <span className="kicker">{label.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 28 }}>
        Counts include unpublished items. Start with <Link to="/vendors">Vendors</Link>.
      </p>
    </>
  );
}