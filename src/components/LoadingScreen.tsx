import { useEffect, useState } from "react";

const LoadingScreen = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary to-primary-light">
      <div className="text-center">
        <div className="relative">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-32 h-32 object-contain animate-bounce"
          />
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white animate-fade-in">
          Ai | Egyptian Doctor
        </h1>
        <div className="mt-4 flex gap-2 justify-center">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
