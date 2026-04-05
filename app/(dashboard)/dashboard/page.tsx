export default function DashboardPage() {
  return (
    <div>
      <div className="flex justify-between">
        <div>
          <p className="text-3xl font-display">Performance hub</p>
          <p>Dashboard Overwiew</p>
        </div>
        <div>
          <button>Last 30 days</button>
          <button>Export Reports</button>
        </div>
      </div>
      <div></div>
    </div>
  );
}
