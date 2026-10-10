export function formatNaira(amount: number) {
  return `₦${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
// "14:00:00" -> "2:00 PM"
export function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}