import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User tried to access:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0f172a] text-white">
      {/* دوائر إضاءة خلفية */}
      <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[150px] animate-pulse"></div>

      {/* الرقم */}
      <h1 className="relative z-10 text-[10rem] font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-cyan-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.5)] select-none">
        404
      </h1>

      {/* النصوص */}
      <p className="z-10 mt-2 text-2xl font-semibold text-gray-200">الصفحة مش موجودة</p>
      <p className="z-10 mt-1 text-gray-400 max-w-sm text-center">
        يمكن تكون كتبت العنوان غلط، أو الصفحة راحت في إجازة بدون إذنك.
      </p>

      {/* زر الرجوع */}
      <a
        href="/"
        className="z-10 mt-6 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:shadow-cyan-500/30"
      >
        ارجع للرئيسية
      </a>

      {/* تأثير متحرك بسيط في الخلفية */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.1),transparent_70%)] animate-[pulse_5s_infinite_alternate]"></div>
    </div>
  );
};

export default NotFound;
