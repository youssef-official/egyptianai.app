import { useEffect, useState } from "react";

const LoadingScreen = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 2500); // وقت الظهور قبل الاختفاء
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white"
      style={{
        animation: "fadeIn 0.6s ease-in-out",
      }}
    >
      <style>{`
        @keyframes rotateCircle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); transform: scale(1); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.6); transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dots {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-5px); }
        }
      `}</style>

      {/* الدائرة المتحركة */}
      <div className="relative flex items-center justify-center">
        <div
          style={{
            width: "140px",
            height: "140px",
            border: "5px solid rgba(255,255,255,0.2)",
            borderTopColor: "white",
            borderRadius: "50%",
            animation: "rotateCircle 1.5s linear infinite, pulseGlow 2.5s ease-in-out infinite",
          }}
        ></div>

        {/* اللوجو */}
        <img
          src="/logo.png"
          alt="Logo"
          style={{
            width: "80px",
            height: "80px",
            objectFit: "contain",
            position: "absolute",
            animation: "pulseGlow 3s ease-in-out infinite",
          }}
        />
      </div>

      {/* النص */}
      <h1
        className="mt-6 text-2xl font-bold tracking-wide"
        style={{
          animation: "fadeIn 1s ease-in-out",
        }}
      >
        Ai | Egyptian Doctor
      </h1>

      {/* النقاط المتحركة */}
      <div className="mt-4 flex gap-2 justify-center">
        <div
          className="w-2 h-2 rounded-full bg-white"
          style={{ animation: "dots 1.4s infinite" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-white"
          style={{ animation: "dots 1.4s infinite 0.2s" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-white"
          style={{ animation: "dots 1.4s infinite 0.4s" }}
        />
      </div>
    </div>
  );
};

export default LoadingScreen;
