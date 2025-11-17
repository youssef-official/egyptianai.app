import { useEffect, useState } from "react";
import { Home, Stethoscope, Wallet, User, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

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
      className={`flex flex-col items-center justify-center gap-1 py-3 px-4 rounded-2xl transition-all min-w-[70px] hover-lift ${
        isActive
          ? "text-primary scale-105 bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      <Icon className={`w-6 h-6 ${isActive ? "animate-bounce-subtle" : ""}`} />
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const { t } = useTranslation();

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
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t shadow-strong z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-20 max-w-md mx-auto px-6">
        <NavItem
          icon={Home}
          label={t('common.home')}
          to="/"
          isActive={location.pathname === "/"}
        />
        {!isDoctor && (
          <NavItem
            icon={Stethoscope}
            label={t('common.doctors')}
            to="/doctors"
            isActive={location.pathname === "/doctors"}
          />
        )}
        {!isDoctor && (
          <NavItem
            icon={Wallet}
            label={t('common.wallet')}
            to="/wallet"
            isActive={location.pathname === "/wallet"}
          />
        )}
        <NavItem
          icon={User}
          label={t('common.profile')}
          to="/profile"
          isActive={location.pathname === "/profile"}
        />
        {isDoctor && (
          <NavItem
            icon={Stethoscope}
            label={t('common.myPanel')}
            to="/doctor-dashboard"
            isActive={location.pathname === "/doctor-dashboard"}
          />
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
