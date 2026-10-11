type Dated = { starts_on?: string | null; ends_on?: string | null };

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function isPastEvent(event: Dated) {
  const last = event.ends_on ?? event.starts_on;
  return !!last && last < today();
}