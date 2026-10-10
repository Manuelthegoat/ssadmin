import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function Login() {
  const { user, sendCode, verifyCode } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (user) return <Navigate to="/" replace />;

  const cleanEmail = email.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  async function requestCode() {
    if (!validEmail || busy) return;
    setBusy(true);
    setError(null);
    const err = await sendCode(cleanEmail);
    setBusy(false);
    // an unknown email looks the same as a known one, so the form can't be
    // used to find out who has an account
    if (err && !err.toLowerCase().includes("signups not allowed")) {
      setError(err);
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(RESEND_SECONDS);
  }

  async function submitCode() {
    if (code.length < OTP_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const err = await verifyCode(cleanEmail, code);
    setBusy(false);
    if (err) {
      setError("That code didn't work. Check it or request a new one.");
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="center-screen">
      <div className="login">
        <p className="kicker">STREET SOUK</p>
        <h1 className="display">ADMIN</h1>

        {step === "email" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestCode();
            }}
          >
            <p className="muted">Enter your email and we'll send you a code.</p>
            <label className="label" htmlFor="email">
              EMAIL
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
            {error && <p className="error">{error}</p>}
            <button className="btn block" disabled={!validEmail || busy}>
              {busy ? "SENDING..." : "SEND ME A CODE"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitCode();
            }}
          >
            <p className="muted">
              If {cleanEmail} can sign in, we've sent a {OTP_LENGTH}-digit code to it.
            </p>
            <label className="label" htmlFor="code">
              CODE
            </label>
            <input
              id="code"
              className="input code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
              }
              placeholder={"0".repeat(OTP_LENGTH)}
              autoFocus
            />
            {error && <p className="error">{error}</p>}
            <button
              className="btn block"
              disabled={code.length < OTP_LENGTH || busy}
            >
              {busy ? "CHECKING..." : "VERIFY & SIGN IN"}
            </button>
            <div className="login-links">
              <button
                type="button"
                className="link"
                onClick={requestCode}
                disabled={cooldown > 0 || busy}
              >
                {cooldown > 0 ? `RESEND IN ${cooldown}S` : "RESEND CODE"}
              </button>
              <button
                type="button"
                className="link"
                onClick={() => {
                  setStep("email");
                  setError(null);
                }}
              >
                USE A DIFFERENT EMAIL
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
