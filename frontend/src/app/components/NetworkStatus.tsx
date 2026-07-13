import { useEffect, useState } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

type NetStatus = "online" | "offline" | "restored";

export function NetworkStatus() {
  const [status, setStatus] = useState<NetStatus>("online");

  useEffect(() => {
    if (!navigator.onLine) setStatus("offline");

    const handleOffline = () => setStatus("offline");
    const handleOnline = () => {
      setStatus("restored");
      setTimeout(() => setStatus("online"), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const visible = status !== "online";

  return (
    <div
      className="fixed left-0 right-0 z-[60] flex items-center justify-center gap-2 h-9 text-sm font-medium transition-all duration-300 ease-in-out"
      style={{
        top: visible ? 0 : "-2.25rem",
        backgroundColor: status === "restored" ? "#39e079" : "#323232",
        color: status === "restored" ? "#0a0f0c" : "#ffffff",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {status === "offline" ? (
        <>
          <WifiOff size={15} />
          <span>You are offline</span>
        </>
      ) : (
        <>
          <CheckCircle2 size={15} />
          <span>Back online</span>
        </>
      )}
    </div>
  );
}
