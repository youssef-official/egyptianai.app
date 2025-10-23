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
      <div className="relative flex flex-col items-center justify-center text-center">
        {/* اللوجو */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-spin-slow"></div>
          <div className="absolute inset-2 rounded-full border-4 border-t-white border-b-transparent border-l-transparent border-r-transparent animate-spin-fast"></div>
          <img
            src="/logo.png"
            alt="Logo"
            className="w-24 h-24 object-contain z-10 animate-bounce"
          />
        </div>

        {/* اسم البراند */}
        <h1 className="mt-6 text-2xl font-bold text-white animate-fade-in">
          Ai | Egyptian Doctor
        </h1>

        {/* النقط المتحركة */}
        <div className="mt-4 flex gap-2 justify-center">
          <div
            className="w-2 h-2 rounded-full bg-white animate-pulse"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 rounded-full bg-white animate-pulse"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 rounded-full bg-white animate-pulse"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>

      {/* لمعة متحركة خفيفة */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine"></div>
    </div>
  );
};

export default LoadingScreen;
