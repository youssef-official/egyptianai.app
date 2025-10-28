import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Stethoscope, LogOut, Wallet as WalletIcon, Bot, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FeaturedDoctors from "@/components/FeaturedDoctors";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-strong">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">مرحباً، {profile?.full_name}</h1>
              <p className="text-xs text-muted-foreground">منصة الاستشارات الطبية</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleLogout} 
            className="gap-2 rounded-full h-10 w-10 p-0"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Wallet Summary */}
        <Card className="mb-6 shadow-strong animate-slide-in-right rounded-3xl overflow-hidden border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white pb-4">
            <div className="flex items-center gap-2 text-base">
              <WalletIcon className="w-5 h-5" />
              محفظتي
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <div className="text-center space-y-4">
              <div className="text-3xl font-bold text-primary">
                {wallet?.balance?.toFixed(2) || "0.00"} <span className="text-lg">جنيه</span>
              </div>
              <div className="flex gap-3 justify-center">
                <Button 
                  className="bg-gradient-to-r from-primary to-primary-light hover:shadow-glow rounded-full h-10 px-6"
                  onClick={() => navigate("/transfer")}
                >
                  تحويل
                </Button>
                <Button 
                  variant="outline"
                  className="rounded-full h-10 px-6"
                  onClick={() => navigate("/wallet")}
                >
                  فتح المحفظة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* تحدث مع دكتور حقيقي */}
          <Card 
            className="cursor-pointer hover:shadow-strong transition-all hover:scale-[1.02] animate-fade-in rounded-3xl border-0 shadow-medium"
            onClick={() => navigate("/doctors")}
          >
            <CardHeader className="p-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Stethoscope className="w-7 h-7 text-primary" />
                </div>
                <div className="text-sm font-semibold">تحدث مع دكتور حقيقي</div>
              </div>
            </CardHeader>
          </Card>

          {/* تحدث مع الذكاء الاصطناعي */}
          <Card 
            className="cursor-pointer hover:shadow-strong transition-all hover:scale-[1.02] animate-fade-in rounded-3xl border-0 shadow-medium"
            onClick={() => navigate("/ai-chat")}
          >
            <CardHeader className="p-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Bot className="w-7 h-7 text-primary" />
                </div>
                <div className="text-sm font-semibold">تحدث مع الذكاء الاصطناعي</div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <FeaturedDoctors />
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
