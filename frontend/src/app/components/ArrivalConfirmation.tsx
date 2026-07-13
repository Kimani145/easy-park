import { CheckCircle2, MapPin, Ticket, Clock, CircleParking } from "lucide-react";

type Parking = { id: number; name: string; address: string; };
type Reservation = { id: string; spotNumber: string; startTime: string; duration: number; };

export function ArrivalConfirmation({ parking, reservation, onClose }: {
  parking: Parking;
  reservation: Reservation | null;
  onClose: () => void;
}) {
  const endTime = reservation ? (() => {
    const [h, m] = reservation.startTime.split(":").map(Number);
    const e = new Date(0, 0, 0, h + reservation.duration, m);
    return `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;
  })() : null;

  const checklist = [
    "Park within your reserved spot",
    "Display your Booking ID if requested",
    ...(endTime ? [`Your reservation is active until ${endTime}`] : []),
    "Enjoy your visit!",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Success header */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6 text-center">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-full bg-[#39e079]/15 border-2 border-[#39e079]/30 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-[#39e079]" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#39e079] flex items-center justify-center">
              <CheckCircle2 size={14} className="text-[#0a0f0c]" />
            </div>
          </div>

          <p className="text-[10px] font-mono text-[#39e079] tracking-widest uppercase mb-1">Arrival Confirmed</p>
          <h2 className="text-xl font-bold text-foreground mb-0.5">Welcome to</h2>
          <h2 className="text-xl font-bold text-foreground">{parking.name}!</h2>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <MapPin size={10} /> {parking.address}
          </p>
        </div>

        {/* Reservation detail strip */}
        {reservation && (
          <div className="mx-5 mb-5 rounded-xl bg-secondary/50 border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#39e079]/15 border border-[#39e079]/25 flex items-center justify-center">
                <CircleParking size={18} className="text-[#39e079]" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Your Spot</p>
                <p className="text-lg font-bold font-mono text-foreground">{reservation.spotNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-0.5">Booking ID</p>
              <p className="text-sm font-bold font-mono text-foreground tracking-wider">{reservation.id}</p>
              {endTime && (
                <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                  <Clock size={9} /> Until {endTime}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="px-5 pb-5 space-y-2.5">
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-3">Next steps</p>
          {checklist.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#39e079]/15 border border-[#39e079]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 size={10} className="text-[#39e079]" />
              </div>
              <p className="text-sm text-foreground leading-snug">{item}</p>
            </div>
          ))}
        </div>

        <div className="px-5 pb-6">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
