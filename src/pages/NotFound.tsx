import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User tried to access:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <h1 className="text-[8rem] font-extrabold text-gray-800 leading-none">404</h1>
        <p className="text-2xl font-medium text-gray-600">الصفحة اللي بتدور عليها مش موجودة</p>
        <p className="text-sm text-gray-500 mt-2">
          يا إما الصفحة اتنقلت، يا إما حصلت غلطة في العنوان... أو في مصيرنا كلنا.
        </p>
      </motion.div>

      <motion.a
        href="/"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white shadow-md transition-colors hover:bg-blue-700"
      >
        <Home size={20} />
        <span>العودة للرئيسية</span>
      </motion.a>

      <motion.div
        className="absolute bottom-6 text-xs text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        &copy; {new Date().getFullYear()} موقعك الجميل. كل الحقوق محفوظة، على الورق على الأقل.
      </motion.div>
    </div>
  );
};

export default NotFound;
