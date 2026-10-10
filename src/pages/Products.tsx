import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import ImageUpload from "../components/ImageUpload";
import { formatNaira } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { AdminProduct, VendorOption } from "../lib/types";

const DEPARTMENTS = ["UNISEX", "MENS", "WOMENS"] as const;

type FormState = {
  id: string | null;
  vendor_id: string;
  name: string;
  price: string;
  department: AdminProduct["department"];
  image_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
};

const blank: FormState = {
  id: null,
  vendor_id: "",
  name: "",
  price: "",
  department: "UNISEX",
  image_url: null,
  is_featured: false,
  is_published: true,
  sort_order: 0,
};

function toForm(p: AdminProduct): FormState {
  return {
    id: p.id,
    vendor_id: p.vendor_id,
    name: p.name,
    price: String(p.price_ngn),
    department: p.department,
    image_url: p.image_url,
    is_featured: p.is_featured,
    is_published: p.is_published,
    sort_order: p.sort_order,
  };
}

export default function Products() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, v] = await Promise.all([
      supabase
        .from("products")
        .select("*, vendors(name, slug)")
        .order("created_at", { ascending: false })
        .order("sort_order"),
      supabase.from("vendors").select("id, name, slug").order("name"),
    ]);
    if (p.error) setError(p.error.message);
    else {
      setProducts(p.data as unknown as AdminProduct[]);
      setError(null);
    }
    if (v.data) setVendors(v.data as VendorOption[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      vendorFilter
        ? products.filter((p) => p.vendor_id === vendorFilter)
        : products,
    [products, vendorFilter],
  );

  const formVendor = vendors.find((v) => v.id === form?.vendor_id);

  function openNew() {
    setForm({ ...blank, vendor_id: vendorFilter });
    setFormError(null);
  }

  function openEdit(product: AdminProduct) {
    setForm(toForm(product));
    setFormError(null);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const price = Number(form.price);
    if (!form.vendor_id) return setFormError("Choose a vendor.");
    if (!form.name.trim()) return setFormError("Give the product a name.");
    if (form.price.trim() === "" || !Number.isInteger(price) || price < 0) {
      return setFormError("Price must be a whole number of naira, e.g. 35000.");
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      vendor_id: form.vendor_id,
      name: form.name.trim(),
      price_ngn: price,
      department: form.department,
      image_url: form.image_url,
      is_featured: form.is_featured,
      is_published: form.is_published,
      sort_order: form.sort_order,
    };
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
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
    if (!window.confirm(`Delete ${form.name}? This can't be undone.`)) return;
    setSaving(true);
    const { error } = await supabase.from("products").delete().eq("id", form.id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    load();
  }

  async function toggle(product: AdminProduct, field: "is_published" | "is_featured") {
    const { error } = await supabase
      .from("products")
      .update({ [field]: !product[field] })
      .eq("id", product.id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">CONTENT</p>
          <h1 className="display">PRODUCTS</h1>
        </div>
        <button className="btn" onClick={openNew}>
          + NEW PRODUCT
        </button>
      </div>

      <div className="toolbar">
        <select
          className="input"
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
        >
          <option value="">All vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <span className="muted small">{visible.length} products</span>
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
                <th>PRODUCT</th>
                <th>PRICE</th>
                <th>DEPARTMENT</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="thumb" />
                    ) : (
                      <div className="thumb empty">{p.name.charAt(0)}</div>
                    )}
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="muted small">{p.vendors?.name ?? "–"}</div>
                  </td>
                  <td>{formatNaira(p.price_ngn)}</td>
                  <td>{p.department}</td>
                  <td>
                    <button
                      className={`badge ${p.is_published ? "on" : "off"}`}
                      onClick={() => toggle(p, "is_published")}
                      title="Click to toggle"
                    >
                      {p.is_published ? "PUBLISHED" : "HIDDEN"}
                    </button>
                    <button
                      className={`badge ${p.is_featured ? "on" : "off"}`}
                      onClick={() => toggle(p, "is_featured")}
                      title="Click to toggle"
                    >
                      {p.is_featured ? "FEATURED" : "NOT FEATURED"}
                    </button>
                  </td>
                  <td className="right">
                    <button className="btn small ghost" onClick={() => openEdit(p)}>
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted center">
                    No products yet.
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
              <h2 className="display">
                {form.id ? "EDIT PRODUCT" : "NEW PRODUCT"}
              </h2>
              <button type="button" className="link" onClick={() => setForm(null)}>
                CLOSE
              </button>
            </div>

            <div className="drawer-body">
              <div className="field">
                <label className="label" htmlFor="p-vendor">
                  VENDOR
                </label>
                <select
                  id="p-vendor"
                  className="input"
                  value={form.vendor_id}
                  onChange={(e) => update("vendor_id", e.target.value)}
                >
                  <option value="">Choose a vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="p-name">
                  PRODUCT NAME
                </label>
                <input
                  id="p-name"
                  className="input"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>

              <div className="row2">
                <div className="field">
                  <label className="label" htmlFor="p-price">
                    PRICE (₦)
                  </label>
                  <input
                    id="p-price"
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    placeholder="35000"
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="p-dept">
                    DEPARTMENT
                  </label>
                  <select
                    id="p-dept"
                    className="input"
                    value={form.department}
                    onChange={(e) =>
                      update("department", e.target.value as FormState["department"])
                    }
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <ImageUpload
                label="PRODUCT IMAGE"
                value={form.image_url}
                folder={`products/${formVendor?.slug ?? "new"}`}
                disabled={!formVendor}
                onChange={(url) => update("image_url", url)}
              />
              {!formVendor && (
                <p className="muted small">Choose a vendor to enable uploads.</p>
              )}

              <div className="row2">
                <div className="field">
                  <label className="label" htmlFor="p-sort">
                    SORT ORDER
                  </label>
                  <input
                    id="p-sort"
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
                      checked={form.is_featured}
                      onChange={(e) => update("is_featured", e.target.checked)}
                    />
                    FEATURED
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