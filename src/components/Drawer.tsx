import { useEffect } from "react";
import type { FormEvent, ReactNode } from "react";

type Props = {
  title: string;
  saving: boolean;
  error: string | null;
  canDelete: boolean;
  deleteLabel?: string;
  onClose: () => void;
  onSubmit: () => void;
  onDelete: () => void;
  children: ReactNode;
};

export default function Drawer({
  title,
  saving,
  error,
  canDelete,
  deleteLabel = "DELETE",
  onClose,
  onSubmit,
  onDelete,
  children,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  function handle(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <>
      <div className="overlay" onClick={() => !saving && onClose()} />
      <form className="drawer" onSubmit={handle}>
        <div className="drawer-head">
          <h2 className="display">{title}</h2>
          <button
            type="button"
            className="drawer-close"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="drawer-body">
          {children}
          {error && <p className="error">{error}</p>}
        </div>
        <div className="drawer-foot">
          {canDelete ? (
            <button
              type="button"
              className="btn ghost danger"
              onClick={onDelete}
              disabled={saving}
            >
              {deleteLabel}
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
  );
}