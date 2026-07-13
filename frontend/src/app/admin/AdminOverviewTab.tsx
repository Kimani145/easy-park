import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { MOCK_REVENUE, MOCK_RECENT_RESERVATIONS, MOCK_ZONES } from "./mockData";
import { CheckCircle2, XCircle, Zap } from "lucide-react";

const STATUS_CONFIG = {
  active:    { label: "Active",    color: "#10b981", Icon: Zap },
  completed: { label: "Completed", color: "#6366f1", Icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "#ef4444", Icon: XCircle },
};

const zoneOccupancyData = MOCK_ZONES.map(z => ({
  name: z.label.split(" — ")[0],
  occupancy: Math.round((z.occupied / z.total) * 100),
  free: Math.round(((z.total - z.occupied) / z.total) * 100),
}));

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 px-3 py-2" style={{ background: "#1e293b" }}>
      <p className="text-[10px] font-mono text-white/50 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 px-3 py-2" style={{ background: "#1e293b" }}>
      <p className="text-[10px] font-mono text-white/50 mb-1">{label}</p>
      <p className="text-sm font-bold text-[#10b981]">Occupied: {payload[0]?.value}%</p>
    </div>
  );
}

export function AdminOverviewTab() {
  const totalRevenue = MOCK_REVENUE.reduce((s, r) => s + r.revenue, 0);
  const thisMonth = MOCK_REVENUE[MOCK_REVENUE.length - 1].revenue;
  const lastMonth = MOCK_REVENUE[MOCK_REVENUE.length - 2].revenue;
  const growth = (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Revenue summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Revenue (YTD)", value: `$${totalRevenue.toLocaleString()}`, sub: "All zones" },
          { label: "This Month", value: `$${thisMonth.toLocaleString()}`, sub: `${Number(growth) >= 0 ? "+" : ""}${growth}% vs last month` },
          { label: "Active Reservations", value: String(MOCK_RECENT_RESERVATIONS.filter(r => r.status === "active").length), sub: "Right now" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border border-white/8 p-4" style={{ background: "#0f172a" }}>
            <p className="text-[10px] font-mono text-white/40 tracking-widest uppercase mb-1">{label}</p>
            <p className="text-xl font-black text-white">{value}</p>
            <p className="text-[11px] font-mono text-white/30 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="rounded-xl border border-white/8 p-5" style={{ background: "#0f172a" }}>
        <p className="text-[10px] font-mono text-white/40 tracking-widest uppercase mb-4">Monthly Revenue</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={MOCK_REVENUE} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="month"
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Zone occupancy bar chart */}
      <div className="rounded-xl border border-white/8 p-5" style={{ background: "#0f172a" }}>
        <p className="text-[10px] font-mono text-white/40 tracking-widest uppercase mb-4">Zone Occupancy %</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={zoneOccupancyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="occupancy" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent reservations table */}
      <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "#0f172a" }}>
        <div className="px-5 py-4 border-b border-white/8">
          <p className="text-[10px] font-mono text-white/40 tracking-widest uppercase">Recent Reservations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["ID", "Driver", "Zone / Slot", "Date", "Duration", "Cost", "Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-mono text-white/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_RECENT_RESERVATIONS.map((r, i) => {
                const cfg = STATUS_CONFIG[r.status];
                return (
                  <tr key={r.id} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                    <td className="px-4 py-3 text-[11px] font-mono text-white/50">{r.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{r.driver}</td>
                    <td className="px-4 py-3 text-xs font-mono text-white/60">{r.zone} · {r.slot}</td>
                    <td className="px-4 py-3 text-xs font-mono text-white/50">{r.date}</td>
                    <td className="px-4 py-3 text-xs font-mono text-white/60">{r.duration}h</td>
                    <td className="px-4 py-3 text-sm font-bold font-mono text-white">${r.cost.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[9px] font-bold font-mono tracking-widest px-2 py-1 rounded border"
                        style={{ color: cfg.color, borderColor: `${cfg.color}40`, background: `${cfg.color}15` }}
                      >
                        {cfg.label.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
