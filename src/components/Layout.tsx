import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { EventScopeProvider, useEventScope } from "../events/EventScope";

const top = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/events", label: "Events", end: false },
];
const eventPages = [
  { to: "/schedule", label: "Schedule", end: false },
  { to: "/lineup", label: "Lineup", end: false },
  { to: "/marketplace", label: "Marketplace", end: false },
  { to: "/faqs", label: "FAQs", end: false },
  { to: "/feed", label: "Live feed", end: false },
];
const homePages = [
  { to: "/news", label: "News (SS TV)", end: false },
  { to: "/topics", label: "Topics", end: false },
];
const globalPages = [
  { to: "/vendors", label: "Vendors", end: false },
  { to: "/products", label: "Products", end: false },
  { to: "/admins", label: "Admins", end: false },
];
const soon = ["Map", "Push"];

function Item({ to, label, end }: { to: string; label: string; end: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
    >
      {label}
    </NavLink>
  );
}

function EventPicker() {
  const { events, event, setEventId } = useEventScope();
  return (
    <div className="event-picker">
      <span className="kicker">WORKING ON</span>
      <select
        className="input"
        value={event?.id ?? ""}
        onChange={(e) => setEventId(e.target.value)}
        disabled={events.length === 0}
      >
        {events.length === 0 && <option value="">No events yet</option>}
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.title}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // close the menu after picking a page
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // while the menu is open: Esc closes it and the page behind doesn't scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <EventScopeProvider>
      <div className="shell">
        <header className="topbar">
          <button
            className="burger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <img src="/sslogo.png" alt="Street Souk" className="brand-logo" />
          <span className="kicker">ADMIN</span>
        </header>

        {open && (
          <button
            type="button"
            className="sidebar-overlay"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
        )}

        <aside className={`sidebar${open ? " open" : ""}`}>
          <div className="brand">
            <img src="/sslogo.png" alt="Street Souk" className="brand-logo" />
            <span className="kicker">ADMIN</span>
            <button
              className="sidebar-close"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          <nav>
            {top.map((i) => (
              <Item key={i.to} {...i} />
            ))}
            <span className="nav-group">THIS EVENT</span>
            <EventPicker />
            {eventPages.map((i) => (
              <Item key={i.to} {...i} />
            ))}
            <span className="nav-group">HOME SCREEN</span>
            {homePages.map((i) => (
              <Item key={i.to} {...i} />
            ))}
            <span className="nav-group">EVERYTHING ELSE</span>
            {globalPages.map((i) => (
              <Item key={i.to} {...i} />
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
    </EventScopeProvider>
  );
}