import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const live = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/vendors", label: "Vendors", end: false },
  { to: "/products", label: "Products", end: false },
  { to: "/schedule", label: "Schedule", end: false },
  { to: "/feed", label: "Live feed", end: false },
  { to: "/faqs", label: "FAQs", end: false },
  { to: "/admins", label: "Admins", end: false },
    { to: "/schedule", label: "Schedule", end: false },
  { to: "/lineup", label: "Lineup", end: false },
];
const soon = ["Map", "Push"];

export default function Layout() {
  const { user, signOut } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="display">STREET SOUK</span>
          <span className="kicker">ADMIN</span>
        </div>
        <nav>
          {live.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {soon.map((label) => (
            <span key={label} className="nav-item disabled">
              {label} <em>SOON</em>
            </span>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="muted small">{user?.email}</span>
          <button className="link" onClick={signOut}>
            SIGN OUT
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
