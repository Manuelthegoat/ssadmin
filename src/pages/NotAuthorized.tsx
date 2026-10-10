import { useAuth } from "../auth/AuthContext";

export default function NotAuthorized() {
  const { signOut } = useAuth();
  return (
    <div className="center-screen">
      <div className="login">
        <p className="kicker">ACCESS</p>
        <h1 className="display">STAFF ONLY</h1>
        <p className="muted">
          This area is for Street Souk staff. If you think you should have
          access, ask an admin to add you.
        </p>
        <button className="btn block" onClick={signOut}>
          SIGN OUT
        </button>
      </div>
    </div>
  );
}