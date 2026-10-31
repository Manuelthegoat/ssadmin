import { useCallback, useEffect, useMemo, useState } from "react";
import Drawer from "../components/Drawer";
import ImageUpload from "../components/ImageUpload";
import { slugify } from "../lib/slug";
import { supabase } from "../lib/supabase";
import type { AdminVendor } from "../lib/types";

const CATEGORIES = ["FOOTWEAR", "APPAREL", "ACCESSORIES"];

type Filter = "all" | "linked" | "unlinked" | "hidden";

type SyncResult = {
  total: number;
  created: number;
  matched: number;
  missing: string[];
};

type FormState = {
  id: string | null;
  slug: string;
  name: string;
  category: string;
  detail: string;
  about: string;
  logo_url: string | null;
  campaign_url: string | null;
  is_published: boolean;
  sort_order: number;
};

const blank: FormState = {
  id: null,
  slug: "",
  name: "",
  category: "APPAREL",
  detail: "",
  about: "",
  logo_url: null,
  campaign_url: null,
  is_published: true,
  sort_order: 0,
};

function toForm(v: AdminVendor): FormState {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    category: v.category,
    detail: v.detail ?? "",
    about: v.about ?? "",
    logo_url: v.logo_url,
    campaign_url: v.campaign_url,
    is_published: v.is_published,
    sort_order: v.sort_order,
  };
}

export default function Vendors() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) setError(error.message);
    else {
      setVendors(data as AdminVendor[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (q && !`${v.name} ${v.slug}`.toLowerCase().includes(q)) return false;
      if (filter === "linked") return !!v.zappie_key;
      if (filter === "unlinked") return !v.zappie_key;
      if (filter === "hidden") return !v.is_published;
      return true;
    });
  }, [vendors, search, filter]);

  async function sync() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    const { data, error } = await supabase.functions.invoke("sync-zappie");
    setSyncing(false);
    if (error) {
      let message = error.message;
      try {
        const body = await (error as unknown as { context?: Response }).context?.json();
        if (body?.error) message = body.error;
      } catch {
        // keep the generic message
      }
      setError(`Sync failed: ${message}`);
      return;
    }
    setSyncResult(data as SyncResult);
    load();
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError("Name and slug are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      category: form.category,
      detail: form.detail.trim() || null,
      about: form.about.trim() || null,
      logo_url: form.logo_url,
      campaign_url: form.campaign_url,
      is_published: form.is_published,
      sort_order: form.sort_order,
    };
    const { error } = form.id
      ? await supabase.from("vendors").update(payload).eq("id", form.id)
      : await supabase.from("vendors").insert(payload);
    setSaving(false);
    if (error) {
      setFormError(
        error.code === "23505"
          ? "That slug is already used by another vendor."
          : error.message,
      );
      return;
    }
    setForm(null);
    load();
  }

  async function remove() {
    if (!form?.id) return;
    const ok = window.confirm(
      `Delete ${form.name}? This removes it from every event and deletes its favorites and passport stamps. It can't be undone. (A linked brand comes back on the next sync.)`,
    );
    if (!ok) return;
    setSaving(true);
    const { error } = await supabase.from("vendors").delete().eq("id", form.id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    load();
  }

  async function toggleFeatured(vendor: AdminVendor) {
    if (!vendor.is_featured && !vendor.is_published) {
      setError("Publish a vendor before featuring it.");
      return;
    }
    setError(null);
    if (!vendor.is_featured) {
      const { error: clearError } = await supabase
        .from("vendors")
        .update({ is_featured: false })
        .eq("is_featured", true);
      if (clearError) {
        setError(clearError.message);
        return;
      }
    }
    const { error } = await supabase
      .from("vendors")
      .update({ is_featured: !vendor.is_featured })
      .eq("id", vendor.id);
    if (error) setError(error.message);
    else load();
  }
  async function togglePublished(vendor: AdminVendor) {
    const { error } = await supabase
      .from("vendors")
      .update({ is_published: !vendor.is_published })
      .eq("id", vendor.id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">CONTENT</p>
          <h1 className="display">VENDORS</h1>
        </div>
        <div className="row-actions">
          <button className="btn ghost" onClick={sync} disabled={syncing}>
            {syncing ? "SYNCING..." : "SYNC FROM ZAPPIE"}
          </button>
          <button
            className="btn"
            onClick={() => {
              setForm({ ...blank, sort_order: vendors.length });
              setSlugTouched(false);
              setFormError(null);
            }}
          >
            + NEW VENDOR
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="panel">
          <p className="kicker" style={{ marginBottom: 8 }}>
            SYNC COMPLETE
          </p>
          <p>
            <strong>{syncResult.total}</strong> brands in Zappie:{" "}
            <strong>{syncResult.created}</strong> added,{" "}
            <strong>{syncResult.matched}</strong> matched to existing vendors.
          </p>
          {syncResult.missing.length > 0 && (
            <p className="muted small" style={{ marginTop: 8 }}>
              Not in Zappie (kept, but unlinked): {syncResult.missing.join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search vendors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          <option value="all">All vendors</option>
          <option value="linked">Linked to Zappie</option>
          <option value="unlinked">Not in Zappie</option>
          <option value="hidden">Hidden</option>
        </select>
        <span className="muted small">{visible.length} vendors</span>
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
                <th>NAME</th>
                <th>CATEGORY</th>
                <th>ZAPPIE</th>
                <th>FEATURED</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.logo_url ? (
                      <img src={v.logo_url} alt="" className="thumb" />
                    ) : v.campaign_url ? (
                      <img
                        src={v.campaign_url}
                        alt=""
                        className="thumb"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div className="thumb empty">{v.name.charAt(0)}</div>
                    )}
                  </td>
                  <td>
                    <strong>{v.name}</strong>
                    <div className="muted small">/{v.slug}</div>
                  </td>
                  <td>{v.category}</td>
                  <td>
                    {v.zappie_key ? (
                      <span className="badge on">
                        LINKED · {v.zappie_items}{" "}
                        {v.zappie_items === 1 ? "ITEM" : "ITEMS"}
                      </span>
                    ) : (
                      <span className="badge">NOT IN ZAPPIE</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`badge ${v.is_featured ? "on" : "off"}`}
                      disabled={!v.is_published && !v.is_featured}
                      onClick={() => toggleFeatured(v)}
                      title={!v.is_published && !v.is_featured ? "Publish before featuring" : "Click to toggle Shop feature"}
                    >
                      {v.is_featured ? "FEATURED" : "FEATURE"}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`badge ${v.is_published ? "on" : "off"}`}
                      onClick={() => togglePublished(v)}
                      title="Click to toggle"
                    >
                      {v.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                  </td>
                  <td className="right">
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setForm(toForm(v));
                        setSlugTouched(true);
                        setFormError(null);
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted center">
                    {vendors.length === 0
                      ? "No vendors yet. Click SYNC FROM ZAPPIE."
                      : "Nothing matches your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT VENDOR" : "NEW VENDOR"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="v-name">
              NAME
            </label>
            <input
              id="v-name"
              className="input"
              value={form.name}
              onChange={(e) => {
                update("name", e.target.value);
                if (!slugTouched) update("slug", slugify(e.target.value));
              }}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="v-slug">
              SLUG (USED IN LINKS; FIXED ONCE SAVED)
            </label>
            <input
              id="v-slug"
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
            <label className="label" htmlFor="v-cat">
              CATEGORY
            </label>
            <select
              id="v-cat"
              className="input"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              {!CATEGORIES.includes(form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="v-detail">
              SHORT DESCRIPTION (DIRECTORY CARD)
            </label>
            <input
              id="v-detail"
              className="input"
              value={form.detail}
              onChange={(e) => update("detail", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="v-about">
              ABOUT (BRAND PAGE)
            </label>
            <textarea
              id="v-about"
              className="input"
              rows={4}
              value={form.about}
              onChange={(e) => update("about", e.target.value)}
            />
          </div>
          <ImageUpload
            label="LOGO"
            value={form.logo_url}
            folder={`vendors/${form.slug || "new"}`}
            disabled={!form.slug}
            onChange={(url) => update("logo_url", url)}
          />
          <ImageUpload
            label="CAMPAIGN IMAGE (CARD AND PAGE HEADER)"
            value={form.campaign_url}
            folder={`vendors/${form.slug || "new"}`}
            disabled={!form.slug}
            onChange={(url) => update("campaign_url", url)}
          />
          <div className="row2">
            <div className="field">
              <label className="label" htmlFor="v-sort">
                SORT ORDER
              </label>
              <input
                id="v-sort"
                className="input"
                type="number"
                value={form.sort_order}
                onChange={(e) => update("sort_order", Number(e.target.value))}
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
          </div>
        </Drawer>
      )}
    </>
  );
}