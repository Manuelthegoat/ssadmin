import { useState } from "react";
import type { ChangeEvent } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  label: string;
  value: string | null;
  folder: string; // e.g. "vendors/bolapsd"
  disabled?: boolean;
  onChange: (url: string | null) => void;
};

export default function ImageUpload({
  label,
  value,
  folder,
  disabled,
  onChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("That image is over 5 MB. Please compress it first.");
      return;
    }
    setBusy(true);
    setError(null);
    const ext =
      (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "png";
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, file, { cacheControl: "31536000", contentType: file.type });
    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="upload">
        {value ? (
          <img src={value} alt="" className="upload-preview" />
        ) : (
          <div className="upload-empty">NO IMAGE</div>
        )}
        <div className="upload-actions">
          <label className={`btn small ghost${disabled || busy ? " is-disabled" : ""}`}>
            {busy ? "UPLOADING..." : value ? "REPLACE" : "UPLOAD"}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={disabled || busy}
              onChange={handleFile}
            />
          </label>
          {value && (
            <button
              type="button"
              className="link"
              onClick={() => onChange(null)}
            >
              REMOVE
            </button>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}