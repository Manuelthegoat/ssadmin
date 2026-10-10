import { useCallback, useEffect, useState } from "react";
import Drawer from "../components/Drawer";
import { supabase } from "../lib/supabase";
import type { AdminFaq } from "../lib/types";

type FormState = {
  id: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
};

const blank: FormState = {
  id: null,
  question: "",
  answer: "",
  sort_order: 0,
  is_published: true,
};

export default function Faqs() {
  const [faqs, setFaqs] = useState<AdminFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .order("sort_order");
    if (error) setError(error.message);
    else {
      setFaqs(data as AdminFaq[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!form) return;
    if (!form.question.trim() || !form.answer.trim()) {
      setFormError("Question and answer are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      sort_order: form.sort_order,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("faqs").update(payload).eq("id", form.id)
      : await supabase.from("faqs").insert(payload);
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
    if (!window.confirm("Delete this FAQ?")) return;
    setSaving(true);
    const { error } = await supabase.from("faqs").delete().eq("id", form.id);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setForm(null);
    load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">CONTENT</p>
          <h1 className="display">FAQS</h1>
        </div>
        <button
          className="btn"
          onClick={() => {
            setForm({ ...blank, sort_order: faqs.length + 1 });
            setFormError(null);
          }}
        >
          + NEW FAQ
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
                <th>#</th>
                <th>QUESTION</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {faqs.map((f) => (
                <tr key={f.id}>
                  <td className="muted">{f.sort_order}</td>
                  <td style={{ maxWidth: 480 }}>
                    <strong>{f.question}</strong>
                    <div className="muted small">{f.answer}</div>
                  </td>
                  <td>
                    <span className={`badge ${f.is_published ? "on" : "off"}`}>
                      {f.is_published ? "PUBLISHED" : "HIDDEN"}
                    </span>
                  </td>
                  <td className="right">
                    <button
                      className="btn small ghost"
                      onClick={() => {
                        setForm({
                          id: f.id,
                          question: f.question,
                          answer: f.answer,
                          sort_order: f.sort_order,
                          is_published: f.is_published,
                        });
                        setFormError(null);
                      }}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
              {faqs.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted center">
                    No FAQs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Drawer
          title={form.id ? "EDIT FAQ" : "NEW FAQ"}
          saving={saving}
          error={formError}
          canDelete={!!form.id}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={remove}
        >
          <div className="field">
            <label className="label" htmlFor="q-question">
              QUESTION
            </label>
            <input
              id="q-question"
              className="input"
              value={form.question}
              onChange={(e) => update("question", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="q-answer">
              ANSWER
            </label>
            <textarea
              id="q-answer"
              className="input"
              rows={6}
              value={form.answer}
              onChange={(e) => update("answer", e.target.value)}
            />
          </div>
          <div className="row2">
            <div className="field">
              <label className="label" htmlFor="q-sort">
                ORDER
              </label>
              <input
                id="q-sort"
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