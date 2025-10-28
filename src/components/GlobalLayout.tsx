import { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

export default function GlobalLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const hideBottomNavOnPaths = [
    "/auth",
    "/admin",
    "/consultation",
    "/ai-chat",
    "/doctor-application",
  ];

  const showBottomNav = !hideBottomNavOnPaths.some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {children}
      </div>
      {showBottomNav && (
        <>
          <div className="h-20 safe-area-bottom" />
          <BottomNav />
        </>
      )}
    </div>
  );
}
