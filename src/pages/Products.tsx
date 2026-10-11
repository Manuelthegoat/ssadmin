import { useCallback, useEffect, useMemo, useState } from "react";
import Drawer from "../components/Drawer";
import ImageUpload from "../components/ImageUpload";
import { formatNaira } from "../lib/format";
import { totalStock } from "../lib/stock";
import { supabase } from "../lib/supabase";
import type { AdminProduct, VendorOption } from "../lib/types";

const DEPARTMENTS = ["UNISEX", "MENS", "WOMENS"] as const;
const MAX_GALLERY = 6;
const CLOTHING = ["XS", "S", "M", "L", "XL", "XXL"];
const SHOES = ["38", "39", "40", "41", "42", "43", "44", "45", "46"];
const ALL_SIZES = [...CLOTHING, ...SHOES];

type SizeRow = { size: string; stock: string };

type FormState = {
  id: string | null;
  vendor_id: string;
  name: string;
  price: string;
  department: AdminProduct["department"];
  topic_id: string;
  description: string;
  sizes: SizeRow[]; // the active sizes, each with its stock
  stock: string; // used only when there are no sizes
  image_url: string | null;
  gallery: (string | null)[];
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
  topic_id: "",
  description: "",
  sizes: [],
  stock: "",
  image_url: null,
  gallery: [],
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
    topic_id: p.topic_id ?? "",
    description: p.description ?? "",
    sizes: (p.size_stock ?? []).map((s) => ({
      size: s.size,
      stock: String(s.stock),
    })),
    stock: String(p.stock ?? 0),
    image_url: p.image_url,
    gallery: p.gallery ?? [],
    is_featured: p.is_featured,
    is_published: p.is_published,
    sort_order: p.sort_order,
  };
}

// standard sizes in their usual order, custom ones after
function sortSizes(rows: SizeRow[]) {
  const order = (s: string) => {
    const i = ALL_SIZES.indexOf(s);
    return i === -1 ? ALL_SIZES.length : i;
  };
  return [...rows].sort((a, b) => order(a.size) - order(b.size));
}

// empty counts as 0; returns null if it isn't a whole number
function parseStock(value: string): number | null {
  const t = value.trim();
  if (t === "") return 0;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export default function Products() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [topics, setTopics] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [customSize, setCustomSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, v, t] = await Promise.all([
      supabase
        .from("products")
        .select("*, vendors(name, slug)")
        .order("created_at", { ascending: false })
        .order("sort_order"),
      supabase.from("vendors").select("id, name, slug").order("name"),
      supabase.from("home_tabs").select("id, label").order("sort_order"),
    ]);
    if (p.error) setError(p.error.message);
    else {
      setProducts(p.data as unknown as AdminProduct[]);
      setError(null);
    }
    if (v.data) setVendors(v.data as VendorOption[]);
    if (t.data) setTopics(t.data as { id: string; label: string }[]);
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

  function openForm(next: FormState) {
    setForm(next);
    setCustomSize("");
    setFormError(null);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateGallery(change: (g: (string | null)[]) => (string | null)[]) {
    setForm((current) =>
      current ? { ...current, gallery: change(current.gallery) } : current,
    );
  }

  function toggleSize(size: string) {
    setForm((cur) => {
      if (!cur) return cur;
      const active = cur.sizes.some((r) => r.size === size);
      return {
        ...cur,
        sizes: active
          ? cur.sizes.filter((r) => r.size !== size)
          : sortSizes([...cur.sizes, { size, stock: "" }]),
      };
    });
  }

  function setSizeStock(size: string, stock: string) {
    setForm((cur) =>
      cur
        ? {
            ...cur,
            sizes: cur.sizes.map((r) => (r.size === size ? { ...r, stock } : r)),
          }
        : cur,
    );
  }

  function addCustomSize() {
    const label = customSize.trim().toUpperCase();
    if (!label) return;
    setForm((cur) =>
      cur && !cur.sizes.some((r) => r.size === label)
        ? { ...cur, sizes: sortSizes([...cur.sizes, { size: label, stock: "" }]) }
        : cur,
    );
    setCustomSize("");
  }

  async function save() {
    if (!form) return;
    const price = Number(form.price);
    if (!form.vendor_id) return setFormError("Choose a vendor.");
    if (!form.name.trim()) return setFormError("Give the product a name.");
    if (form.price.trim() === "" || !Number.isInteger(price) || price < 0) {
      return setFormError("Price must be a whole number of naira, e.g. 35000.");
    }

    const hasSizes = form.sizes.length > 0;
    const sizeStock: { size: string; stock: number }[] = [];
    for (const row of form.sizes) {
      const n = parseStock(row.stock);
      if (n === null) {
        return setFormError(
          `Stock for size ${row.size} must be a whole number (0 or more).`,
        );
      }
      sizeStock.push({ size: row.size, stock: n });
    }
    const plainStock = parseStock(form.stock);
    if (!hasSizes && plainStock === null) {
      return setFormError("Stock must be a whole number (0 or more).");
    }

    setSaving(true);
    setFormError(null);
    const payload = {
      vendor_id: form.vendor_id,
      name: form.name.trim(),
      price_ngn: price,
      department: form.department,
      topic_id: form.topic_id || null,
      description: form.description.trim() || null,
      size_stock: sizeStock,
      stock: hasSizes ? 0 : (plainStock ?? 0),
      image_url: form.image_url,
      gallery: form.gallery.filter((g): g is string => !!g),
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

  async function toggle(
    product: AdminProduct,
    field: "is_published" | "is_featured",
  ) {
    const { error } = await supabase
      .from("products")
      .update({ [field]: !product[field] })
      .eq("id", product.id);
    if (error) setError(error.message);
    else load();
  }

  // one click: set every stock number to 0
  async function markSoldOut(product: AdminProduct) {
    if (
      !window.confirm(
        `Mark ${product.name} as sold out? This sets all its stock to 0.`,
      )
    ) {
      return;
    }
    const { error } = await supabase
      .from("products")
      .update({
        stock: 0,
        size_stock: (product.size_stock ?? []).map((s) => ({ ...s, stock: 0 })),
      })
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
        <button
          className="btn"
          onClick={() => openForm({ ...blank, vendor_id: vendorFilter })}
        >
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
                <th>STOCK</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const total = totalStock(p);
                const out = total <= 0;
                return (
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
                      <div className="muted small">
                        {p.vendors?.name ?? "–"} · {p.department}
                      </div>
                    </td>
                    <td>{formatNaira(p.price_ngn)}</td>
                    <td>
                      <button
                        className={`badge ${out ? "off" : "on"}`}
                        onClick={() =>
                          out
                            ? openForm(toForm(p))
                            : markSoldOut(p)
                        }
                        title={
                          out
                            ? "Click to restock"
                            : "Click to mark as sold out"
                        }
                      >
                        {out ? "SOLD OUT" : `IN STOCK · ${total}`}
                      </button>
                      {(p.size_stock ?? []).length > 0 && (
                        <div className="muted small" style={{ marginTop: 6 }}>
                          {p.size_stock
                            .map((s) => `${s.size}: ${s.stock}`)
                            .join("  ")}
                        </div>
                      )}
                    </td>
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
                      <button
                        className="btn small ghost"
                        onClick={() => openForm(toForm(p))}
                      >
                        EDIT
                      </button>
                    </td>
                  </tr>
                );
              })}
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
        <Drawer
          title={form.id ? "EDIT PRODUCT" : "NEW PRODUCT"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
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

          <div className="field">
            <label className="label" htmlFor="p-topic">
              HOME TOPIC
            </label>
            <select
              id="p-topic"
              className="input"
              value={form.topic_id}
              onChange={(e) => update("topic_id", e.target.value)}
            >
              <option value="">No topic (FOR YOU only)</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="p-desc">
              DESCRIPTION (LEAVE A BLANK LINE BETWEEN PARAGRAPHS)
            </label>
            <textarea
              id="p-desc"
              className="input"
              rows={6}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="field">
            <span className="label">SIZES & STOCK</span>
            <p className="muted small" style={{ marginBottom: 10 }}>
              Click a size to activate it, then type how many you have. A size
              at 0 shows as sold out. When every size is at 0, the whole product
              is sold out.
            </p>
            <div className="chips">
              {CLOTHING.map((size) => (
                <button
                  type="button"
                  key={size}
                  className={`chip${form.sizes.some((r) => r.size === size) ? " active" : ""}`}
                  onClick={() => toggleSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="chips">
              {SHOES.map((size) => (
                <button
                  type="button"
                  key={size}
                  className={`chip${form.sizes.some((r) => r.size === size) ? " active" : ""}`}
                  onClick={() => toggleSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="stock-row" style={{ marginBottom: 14 }}>
              <input
                className="input"
                style={{ maxWidth: 200 }}
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                placeholder="Other size, e.g. ONE SIZE"
              />
              <button
                type="button"
                className="btn small ghost"
                onClick={addCustomSize}
              >
                ADD
              </button>
            </div>

            {form.sizes.length > 0 ? (
              form.sizes.map((row) => (
                <div className="stock-row" key={row.size}>
                  <span className="size-label">{row.size}</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    value={row.stock}
                    onChange={(e) => setSizeStock(row.size, e.target.value)}
                    placeholder="stock"
                  />
                  <button
                    type="button"
                    className="link"
                    onClick={() => toggleSize(row.size)}
                  >
                    REMOVE
                  </button>
                </div>
              ))
            ) : (
              <div className="stock-row">
                <span className="size-label">STOCK</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={1}
                  value={form.stock}
                  onChange={(e) => update("stock", e.target.value)}
                  placeholder="how many do you have?"
                />
              </div>
            )}
          </div>

          <ImageUpload
            label="MAIN IMAGE"
            value={form.image_url}
            folder={`products/${formVendor?.slug ?? "new"}`}
            disabled={!formVendor}
            onChange={(url) => update("image_url", url)}
          />
          {!formVendor && (
            <p className="muted small">Choose a vendor to enable uploads.</p>
          )}

          {form.gallery.map((url, i) => (
            <div key={i}>
              <ImageUpload
                label={`EXTRA PHOTO ${i + 1}`}
                value={url}
                folder={`products/${formVendor?.slug ?? "new"}`}
                disabled={!formVendor}
                onChange={(next) =>
                  updateGallery((g) => g.map((x, idx) => (idx === i ? next : x)))
                }
              />
              <button
                type="button"
                className="link"
                onClick={() =>
                  updateGallery((g) => g.filter((_, idx) => idx !== i))
                }
              >
                REMOVE THIS PHOTO SLOT
              </button>
            </div>
          ))}
          {form.gallery.length < MAX_GALLERY && (
            <button
              type="button"
              className="btn small ghost"
              disabled={!formVendor}
              onClick={() => updateGallery((g) => [...g, null])}
            >
              + ADD ANOTHER PHOTO
            </button>
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
        </Drawer>
      )}
    </>
  );
}