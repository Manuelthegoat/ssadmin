import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../lib/supabase";

type AdminRow = { admin_id: string; admin_email: string; added_at: string };

export default function Admins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_admins");
    if (error) setError(error.message);
    else {
      setAdmins(data as AdminRow[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("add_admin", { p_email: email });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEmail("");
    load();
  }

  async function remove(admin: AdminRow) {
    if (!window.confirm(`Remove admin access for ${admin.admin_email}?`)) return;
    const { error } = await supabase.rpc("remove_admin", {
      p_user_id: admin.admin_id,
    });
    if (error) setError(error.message);
    else load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">ACCESS</p>
          <h1 className="display">ADMINS</h1>
        </div>
      </div>

      <form className="inline-form" onSubmit={add}>
        <input
          className="input"
          type="email"
          placeholder="teammate@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn" disabled={!email.trim() || busy}>
          {busy ? "ADDING..." : "ADD ADMIN"}
        </button>
      </form>
      <p className="muted small" style={{ marginBottom: 20 }}>
        They need to have signed in to the app once so their account exists.
      </p>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>EMAIL</th>
                <th>ADDED</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.admin_id}>
                  <td>
                    <strong>{a.admin_email}</strong>
                    {a.admin_id === user?.id && (
                      <span className="badge on" style={{ marginLeft: 10 }}>
                        YOU
                      </span>
                    )}
                  </td>
                  <td className="muted">
                    {new Date(a.added_at).toLocaleDateString()}
                  </td>
                  <td className="right">
                    {a.admin_id !== user?.id && (
                      <button
                        className="btn small ghost danger"
                        onClick={() => remove(a)}
                      >
                        REMOVE
                      </button>
                    )}
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