import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { EventScopeProvider, useEventScope } from "../events/EventScope";
import { isPastEvent } from "../lib/eventDates";

const top = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/events", label: "Events", end: false },
];
const eventPages = [
  { to: "/schedule", label: "Schedule", end: false },
  { to: "/lineup", label: "Lineup", end: false },
  { to: "/faqs", label: "FAQs", end: false },
];
const globalPages = [
  { to: "/vendors", label: "Vendors", end: false },
  { to: "/products", label: "Products", end: false },
  { to: "/feed", label: "Live feed", end: false },
  { to: "/admins", label: "Admins", end: false },
];
const homePages = [
  { to: "/news", label: "News (SS TV)", end: false },
  { to: "/topics", label: "Topics", end: false },
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
            {isPastEvent(ev) ? " (past)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  return (
    <EventScopeProvider>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="display">STREET SOUK</span>
            <span className="kicker">ADMIN</span>
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
