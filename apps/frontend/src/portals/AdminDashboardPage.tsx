import { useEffect, useState } from "react";
import { ErpLoader } from "../shared/ErpLoader";

const statCards = [
  ["Students", "0", "Enrolled", "border-emerald-500"],
  ["Teachers", "0", "Faculty members", "border-cyan-500"],
  ["Fee Collected", "0", "Successful payments", "border-blue-500"],
  ["Fee Pending", "0", "Pending payments", "border-rose-500"]
] as const;

const branchStats = [
  ["B.Tech", 0],
  ["Diploma", 0],
  ["M.Tech", 0],
  ["Postgraduate", 0]
] as const;

const quickActions = ["+ Add student", "+ Add teacher", "Record payment", "View syllabus", "Promote students", "Fee structure"];

const recentPayments = [
  ["Akhil Kumar", "₹42,000", "Tuition Fee", "Today", "Paid"],
  ["Meghana P", "₹18,000", "Transport", "Yesterday", "Paid"],
  ["Sai Kiran", "₹12,000", "Exam Fee", "Pending", "Due"]
] as const;

export function AdminDashboardPage() {
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsDashboardLoading(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <AdminDashboardSkeleton show={isDashboardLoading} />
      {!isDashboardLoading ? (
        <div className="admin-dashboard">
          <div className="admin-stat-grid">
            {statCards.map(([title, value, caption, border]) => (
              <section key={title} className={`admin-stat-card ${border}`}>
                <p className="admin-stat-title">{title}</p>
                <p className="admin-stat-value">{value}</p>
                <p className="admin-stat-caption">{caption}</p>
              </section>
            ))}
          </div>

          <div className="admin-middle-grid">
            <section className="admin-panel">
              <h2 className="admin-panel-title">Students per branch</h2>
              <div className="admin-branch-list">
                {branchStats.map(([branch, count]) => (
                  <div key={branch} className="admin-branch-row">
                    <span className="admin-branch-name">{branch}</span>
                    <div className="admin-progress-track">
                      <div className="admin-progress-fill" style={{ width: `${Math.max(count * 25, count ? 12 : 0)}%` }} />
                    </div>
                    <span className="admin-branch-count">{count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-panel">
              <h2 className="admin-panel-title">Quick actions</h2>
              <div className="admin-actions-grid">
                {quickActions.map((action, index) => (
                  <button
                    key={action}
                    type="button"
                    className={`admin-action-btn ${index < 2 ? "primary" : index === 2 ? "success" : index === 4 ? "warning" : ""}`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="admin-panel">
            <h2 className="admin-panel-title">Recent payments</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Fee head</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentPayments.map((row) => (
                    <tr key={`${row[0]}-${row[2]}`}>
                      {row.map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function AdminDashboardSkeleton({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="admin-dashboard admin-dashboard-loading">
      <ErpLoader />
    </div>
  );
}
