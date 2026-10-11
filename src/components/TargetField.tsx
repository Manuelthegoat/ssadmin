import { useState } from "react";
import { TARGETS } from "../lib/targets";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export default function TargetField({ label, value, onChange }: Props) {
  const external = /^https?:\/\//i.test(value);
  const [screen, setScreen] = useState(external ? "" : value);
  const [link, setLink] = useState(external ? value : "");

  function emit(nextScreen: string, nextLink: string) {
    onChange(nextLink.trim() || nextScreen);
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="row2">
        <select
          className="input"
          value={screen}
          onChange={(e) => {
            setScreen(e.target.value);
            emit(e.target.value, link);
          }}
        >
          <option value="">Choose a screen…</option>
          {TARGETS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="or an https:// link"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            emit(screen, e.target.value);
          }}
        />
      </div>
      <p className="muted small" style={{ marginTop: 6 }}>
        If you fill in a link, it's used instead of the screen.
      </p>
    </div>
  );
}