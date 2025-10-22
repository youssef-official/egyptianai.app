import { useEffect, useState } from "react";
import { Home, Stethoscope, Wallet, User, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface NavItemProps {
  icon: any;
  label: string;
  to: string;
  isActive: boolean;
}

const NavItem = ({ icon: Icon, label, to, isActive }: NavItemProps) => {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all min-w-[60px] ${
        isActive
          ? "text-primary scale-105"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className={`w-6 h-6 ${isActive ? "animate-pulse-glow" : ""}`} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", session.user.id);

    setProfile(profileData);
    setUserRoles(rolesData || []);
  };

  const isDoctor = profile?.user_type === 'doctor';
  const isAdmin = userRoles?.some(role => role.role === 'admin');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t shadow-strong z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        <NavItem
          icon={Home}
          label="الرئيسية"
          to="/"
          isActive={location.pathname === "/"}
        />
        {!isDoctor && !isAdmin && (
          <NavItem
            icon={Stethoscope}
            label="الأطباء"
            to="/doctors"
            isActive={location.pathname === "/doctors"}
          />
        )}
        {!isDoctor && (
          <NavItem
            icon={Wallet}
            label="المحفظة"
            to={isAdmin ? "/admin-dashboard" : "/wallet"}
            isActive={location.pathname === "/wallet" || (isAdmin && location.pathname === "/admin-dashboard")}
          />
        )}
        <NavItem
          icon={User}
          label="حسابي"
          to="/profile"
          isActive={location.pathname === "/profile"}
        />
        {isDoctor && (
          <NavItem
            icon={Stethoscope}
            label="لوحتي"
            to="/doctor-dashboard"
            isActive={location.pathname === "/doctor-dashboard"}
          />
        )}
        {isAdmin && (
          <NavItem
            icon={Shield}
            label="الإدارة"
            to="/admin-dashboard"
            isActive={location.pathname === "/admin-dashboard"}
          />
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
