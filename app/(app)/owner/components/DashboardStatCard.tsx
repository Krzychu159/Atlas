export default function DashboardStatCard({
  label,
  value,
  note,
  icon,
  accent = "neutral",
}: {
  label: string;
  value: number | string;
  note: string;
  icon: React.ReactNode;
  accent?: "neutral" | "primary" | "success";
}) {
  return (
    <div
      className={`card-shell p-5 min-h-[132px] relative overflow-hidden ${
        accent === "primary" ? "border-b-2 border-primary" : ""
      }`}
    >
      <div className="absolute right-5 top-5 text-on-surface-muted/15">
        {icon}
      </div>

      <p className="text-label text-on-surface-variant">{label}</p>

      <p className="mt-3 text-[2.25rem] leading-none font-semibold tracking-tight">
        {value}
      </p>

      <p
        className={`mt-4 text-sm font-semibold ${
          accent === "success" ? "text-tertiary-light" : "text-primary-light"
        }`}
      >
        {note}
      </p>
    </div>
  );
}
