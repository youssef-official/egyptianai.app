import { Home, Stethoscope, Wallet, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  isActive: boolean;
}

const NavItem = ({ icon: Icon, label, to, isActive }: NavItemProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className={`flex flex-col items-center justify-center gap-1 transition-all ${
        isActive ? "text-primary" : "text-gray-400 hover:text-primary"
      }`}
    >
      <Icon className="w-7 h-7" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: t("common.home"), to: "/" },
    { icon: Stethoscope, label: t("common.doctors"), to: "/doctors" },
    { icon: Wallet, label: t("common.wallet"), to: "/wallet" },
    { icon: User, label: t("common.profile"), to: "/profile" },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-3xl shadow-lg z-50">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            icon={item.icon}
            label={item.label}
            to={item.to}
            isActive={location.pathname === item.to}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
