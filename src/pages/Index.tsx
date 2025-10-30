import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Stethoscope, LogOut, Wallet as WalletIcon, Bot, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import BottomNav from "@/components/BottomNav";
import FeaturedDoctors from "@/components/FeaturedDoctors";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
      await loadUserData(session.user.id);
    }
    setLoading(false);
  };

  const loadUserData = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(profileData);

    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();
    setWallet(walletData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "تم تسجيل الخروج",
      description: "نراك قريباً!",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="container mx-auto px-6 py-8 max-w-md">
        {/* Header with greeting - iOS style */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-500 text-sm mb-1">Hello,</p>
              <h1 className="text-3xl font-bold text-gray-900">{profile?.full_name?.split(' ')[0] || 'مستخدم'}! 👋</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/profile")}
                className="rounded-full h-12 w-12 p-0"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {profile?.full_name?.charAt(0) || 'M'}
                </div>
              </Button>
            </div>
          </div>

          {/* Search bar - iOS style */}
          <div className="relative">
            <input 
              type="text"
              placeholder="Search Doctor"
              onClick={() => navigate("/doctors")}
              className="w-full bg-white rounded-2xl px-12 py-4 text-sm shadow-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
              readOnly
            />
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Specialty Categories - iOS style */}
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-4">
            <div onClick={() => navigate("/doctors")} className="flex flex-col items-center gap-2 cursor-pointer animate-fade-in hover-scale">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center shadow-sm">
                <span className="text-3xl">🧠</span>
              </div>
              <span className="text-xs text-gray-600 text-center">Neurologist</span>
            </div>
            
            <div onClick={() => navigate("/doctors")} className="flex flex-col items-center gap-2 cursor-pointer animate-fade-in hover-scale" style={{animationDelay: '0.1s'}}>
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center shadow-sm">
                <span className="text-3xl">❤️</span>
              </div>
              <span className="text-xs text-gray-600 text-center">Cardiologist</span>
            </div>
            
            <div onClick={() => navigate("/doctors")} className="flex flex-col items-center gap-2 cursor-pointer animate-fade-in hover-scale" style={{animationDelay: '0.2s'}}>
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center shadow-sm">
                <span className="text-3xl">🦴</span>
              </div>
              <span className="text-xs text-gray-600 text-center">Orthopedist</span>
            </div>
            
            <div onClick={() => navigate("/doctors")} className="flex flex-col items-center gap-2 cursor-pointer animate-fade-in hover-scale" style={{animationDelay: '0.3s'}}>
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center shadow-sm">
                <span className="text-3xl">🫁</span>
              </div>
              <span className="text-xs text-gray-600 text-center">Pulmonologist</span>
            </div>
          </div>
        </div>

        {/* Upcoming Appointment Card - iOS style */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Appointment</h2>
          <Card className="rounded-3xl border-0 shadow-lg overflow-hidden bg-gradient-to-br from-primary to-primary-light animate-slide-in-up hover-lift">
            <CardContent className="p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">استشارة طبية</p>
                  <p className="text-white/80 text-sm">احجز موعدك الآن</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>اليوم</span>
                </div>
                <Button 
                  onClick={() => navigate("/doctors")}
                  className="mr-auto bg-white text-primary hover:bg-white/90 rounded-full px-6 h-9 font-semibold shadow-md"
                >
                  احجز الآن
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card 
            onClick={() => navigate("/ai-chat")}
            className="rounded-2xl border-0 shadow-md cursor-pointer hover-lift animate-fade-in bg-white"
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">AI Chat</p>
                  <p className="text-xs text-gray-500">استشارة فورية</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate("/wallet")}
            className="rounded-2xl border-0 shadow-md cursor-pointer hover-lift animate-fade-in bg-white"
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <WalletIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">My Wallet</p>
                  <p className="text-xs text-gray-500">{wallet?.balance?.toFixed(0) || "0"} نقطة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <FeaturedDoctors />
        
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
