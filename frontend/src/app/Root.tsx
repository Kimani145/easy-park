import { Outlet } from "react-router";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { NetworkStatus } from "./components/NetworkStatus";
import { AuthProvider } from "./contexts/AuthContext";

export default function Root() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        <NetworkStatus />
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}
