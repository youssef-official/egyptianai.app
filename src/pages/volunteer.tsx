import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Volunteer = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="p-3 shadow-sm flex items-center bg-white/60 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" onClick={() => navigate("/profile")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          العودة
        </Button>
        <h1 className="mx-auto text-lg font-semibold text-center">منصة المتطوعين</h1>
      </div>

      <div className="flex-1">
        <iframe
          src="https://curaverse-volunteer.lovable.app"
          className="w-full h-[calc(100vh-60px)] border-none"
          style={{ border: "none" }}
          allow="fullscreen; clipboard-read; clipboard-write; camera; microphone"
        />
      </div>
    </div>
  );
};

export default Volunteer;