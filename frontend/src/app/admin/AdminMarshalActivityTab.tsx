import { MOCK_MARSHAL_ACTIVITY, ACTION_LABELS, ACTION_COLORS } from "./mockData";
import { Clock, MapPin, CircleParking, User } from "lucide-react";

export function AdminMarshalActivityTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
          {MOCK_MARSHAL_ACTIVITY.length} recent actions — today
        </p>
        <p className="text-[10px] font-mono text-white/20">Live feed (mock)</p>
      </div>

      {/* Activity log */}
      <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "#0f172a" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                {["Time", "Marshal", "Zone", "Slot", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-mono text-white/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_MARSHAL_ACTIVITY.map((entry, i) => {
                const color = ACTION_COLORS[entry.action];
                const label = ACTION_LABELS[entry.action];
                return (
                  <tr key={entry.id} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                    {/* Time */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-white/25 flex-shrink-0" />
                        <span className="text-[11px] font-mono text-white/50">{entry.timestamp.split(" ")[1]}</span>
                      </div>
                    </td>

                    {/* Marshal */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#f59e0b]/15 border border-[#f59e0b]/25 flex items-center justify-center flex-shrink-0">
                          <User size={10} className="text-[#f59e0b]" />
                        </div>
                        <span className="text-sm font-medium text-white">{entry.marshal}</span>
                      </div>
                    </td>

                    {/* Zone */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={10} className="text-white/25 flex-shrink-0" />
                        <span className="text-xs font-mono text-white/60">{entry.zone}</span>
                      </div>
                    </td>

                    {/* Slot */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <CircleParking size={10} className="text-white/25 flex-shrink-0" />
                        <span className="text-sm font-bold font-mono text-white">{entry.slot}</span>
                      </div>
                    </td>

                    {/* Action badge */}
                    <td className="px-4 py-3">
                      <span
                        className="text-[9px] font-bold font-mono tracking-widest px-2.5 py-1 rounded-lg border"
                        style={{ color, borderColor: `${color}40`, background: `${color}15` }}
                      >
                        {label.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-marshal summary */}
      <div className="grid grid-cols-2 gap-3">
        {(() => {
          const marshals = [...new Set(MOCK_MARSHAL_ACTIVITY.map(a => a.marshal))];
          return marshals.map(m => {
            const actions = MOCK_MARSHAL_ACTIVITY.filter(a => a.marshal === m);
            const initials = m.split(" ").map(w => w[0]).join("");
            return (
              <div key={m} className="rounded-xl border border-white/8 p-4" style={{ background: "#0f172a" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#f59e0b]/15 border border-[#f59e0b]/25 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#f59e0b]">{initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{m}</p>
                    <p className="text-[10px] font-mono text-white/35">{actions.length} actions today</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["marked_free", "marked_occupied", "flagged_unverified", "force_synced"] as const).map(action => {
                    const count = actions.filter(a => a.action === action).length;
                    if (count === 0) return null;
                    return (
                      <div key={action} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: `${ACTION_COLORS[action]}10`, border: `1px solid ${ACTION_COLORS[action]}25` }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ACTION_COLORS[action] }} />
                        <span className="text-[9px] font-mono truncate" style={{ color: ACTION_COLORS[action] }}>{count}× {ACTION_LABELS[action]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
