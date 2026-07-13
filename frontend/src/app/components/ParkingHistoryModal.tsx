import { X, MapPin, Clock, CircleParking, CheckCircle2, XCircle } from "lucide-react";

export type HistoryEntry = {
  id: string;
  parkingName: string;
  address: string;
  date: string;
  startTime: string;
  duration: number;
  totalCost: number;
  status: "completed" | "cancelled";
};

export function ParkingHistoryModal({ entries, onClose }: { entries: HistoryEntry[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col" style={{ maxHeight: "85vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Full History</p>
            <h2 className="text-base font-bold text-foreground">{entries.length} parking sessions</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
            <X size={13} className="text-muted-foreground" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "none" }}>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <CircleParking size={28} className="text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No parking history yet</p>
            </div>
          ) : entries.map(e => (
            <div key={e.id} className={`rounded-xl border p-4 ${e.status === "cancelled" ? "border-[#e05555]/20 bg-[#e05555]/5" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {e.status === "completed" ? (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-medium tracking-widest text-[#39e079] bg-[#39e079]/10 border border-[#39e079]/20 px-1.5 py-0.5 rounded">
                        <CheckCircle2 size={8} /> COMPLETED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-medium tracking-widest text-[#e05555] bg-[#e05555]/10 border border-[#e05555]/20 px-1.5 py-0.5 rounded">
                        <XCircle size={8} /> CANCELLED
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground">{e.id}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{e.parkingName}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MapPin size={9} /> {e.address}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold font-mono text-foreground">${e.totalCost.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">{e.startTime} · {e.duration}h</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CircleParking size={11} className="text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">{e.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="w-full h-11 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-secondary transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
