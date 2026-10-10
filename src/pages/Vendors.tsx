import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import ImageUpload from "../components/ImageUpload";
import { supabase } from "../lib/supabase";
import { slugify } from "../lib/slug";
import type { AdminVendor } from "../lib/types";

const CATEGORIES = ["FOOTWEAR", "APPAREL", "ACCESSORIES"];

type FormState = {
  id: string | null;
  slug: string;
  name: string;
  category: string;
  booth: string;
  detail: string;
  about: string;
  logo_url: string | null;
  campaign_url: string | null;
  is_sponsor: boolean;
  is_published: boolean;
  sort_order: number;
};

const blank: FormState = {
  id: null,
  slug: "",
  name: "",
  category: "ACCESSORIES",
  booth: "",
  detail: "",
  about: "",
  logo_url: null,
  campaign_url: null,
  is_sponsor: false,
  is_published: true,
  sort_order: 0,
};

function toForm(v: AdminVendor): FormState {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    category: v.category,
    booth: v.booth ?? "",
    detail: v.detail ?? "",
    about: v.about ?? "",
    logo_url: v.logo_url,
    campaign_url: v.campaign_url,
    is_sponsor: v.is_sponsor,
    is_published: v.is_published,
    sort_order: v.sort_order,
  };
}

export default function Vendors() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  function openNew() {
    setForm({ ...blank, sort_order: vendors.length + 1 });
    setSlugTouched(false);
    setFormError(null);
  }

  function openEdit(vendor: AdminVendor) {
    setForm(toForm(vendor));
    setSlugTouched(true);
    setFormError(null);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
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
      booth: form.booth.trim() || null,
      detail: form.detail.trim() || null,
      about: form.about.trim() || null,
      logo_url: form.logo_url,
      campaign_url: form.campaign_url,
      is_sponsor: form.is_sponsor,
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
      `Delete ${form.name}? This also deletes its products, favorites and passport stamps. This can't be undone.`,
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
        <button className="btn" onClick={openNew}>
          + NEW VENDOR
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
                <th />
                <th>NAME</th>
                <th>CATEGORY</th>
                <th>BOOTH</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.logo_url ? (
                      <img src={v.logo_url} alt="" className="thumb" />
                    ) : (
                      <div className="thumb empty">{v.name.charAt(0)}</div>
                    )}
                  </td>
                  <td>
                    <strong>{v.name}</strong>
                    <div className="muted small">/{v.slug}</div>
                  </td>
                  <td>{v.category}</td>
                  <td>{v.booth ?? "–"}</td>
                  <td>
                    <button
                      className={`badge ${v.is_published ? "on" : "off"}`}
                      onClick={() => togglePublished(v)}
                      title="Click to toggle"
                    >
                      {v.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                    {v.is_sponsor && <span className="badge sponsor">SPONSOR</span>}
                  </td>
                  <td className="right">
                    <button className="btn small ghost" onClick={() => openEdit(v)}>
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted center">
                    No vendors yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <>
          <div className="overlay" onClick={() => !saving && setForm(null)} />
          <form className="drawer" onSubmit={save}>
            <div className="drawer-head">
              <h2 className="display">{form.id ? "EDIT VENDOR" : "NEW VENDOR"}</h2>
              <button
                type="button"
                className="link"
                onClick={() => setForm(null)}
              >
                CLOSE
              </button>
            </div>

            <div className="drawer-body">
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
                  SLUG (used in links; fixed once saved)
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

              <div className="row2">
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
                  <label className="label" htmlFor="v-booth">
                    BOOTH
                  </label>
                  <input
                    id="v-booth"
                    className="input"
                    value={form.booth}
                    onChange={(e) => update("booth", e.target.value)}
                    placeholder="B-12"
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="v-detail">
                  SHORT DESCRIPTION (directory card)
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
                  ABOUT (vendor page)
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
                label="CAMPAIGN IMAGE (card and page header)"
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
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={form.is_sponsor}
                      onChange={(e) => update("is_sponsor", e.target.checked)}
                    />
                    SPONSOR
                  </label>
                </div>
              </div>

              {formError && <p className="error">{formError}</p>}
            </div>

            <div className="drawer-foot">
              {form.id ? (
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={remove}
                  disabled={saving}
                >
                  DELETE
                </button>
              ) : (
                <span />
              )}
              <button className="btn" disabled={saving}>
                {saving ? "SAVING..." : "SAVE"}
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );
}