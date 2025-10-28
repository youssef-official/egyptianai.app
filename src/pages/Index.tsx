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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-28">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-strong hover-scale">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">مرحباً، {profile?.full_name}</h1>
              <p className="text-sm text-muted-foreground">Cura Verse - منصة الرعاية الصحية</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleLogout} 
            className="gap-2 rounded-2xl h-12 w-12 p-0 hover-lift"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Wallet Summary */}
        <Card className="mb-8 shadow-strong animate-slide-in-right rounded-3xl overflow-hidden border-0 hover-lift">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white pb-6">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <WalletIcon className="w-6 h-6" />
              {t('index.myWallet')}
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-6">
              <div className="text-4xl font-bold text-primary">
                {wallet?.balance?.toFixed(0) || "0"} <span className="text-xl text-muted-foreground">{t('common.points')}</span>
              </div>
              <div className="flex gap-4 justify-center">
                <Button 
                  className="bg-gradient-to-r from-primary to-primary-light hover:shadow-glow rounded-2xl h-12 px-8 font-semibold"
                  onClick={() => navigate("/transfer")}
                >
                  {t('common.transfer')}
                </Button>
                <Button 
                  variant="outline"
                  className="rounded-2xl h-12 px-8 font-semibold border-2"
                  onClick={() => navigate("/wallet")}
                >
                  {t('index.openWallet')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Actions */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* تحدث مع دكتور حقيقي */}
          <Card 
            className="cursor-pointer hover:shadow-strong transition-all hover-scale animate-fade-in rounded-3xl border-0 shadow-medium hover-lift"
            onClick={() => navigate("/doctors")}
          >
            <CardHeader className="p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center hover-scale">
                  <Stethoscope className="w-8 h-8 text-primary" />
                </div>
                <div className="text-base font-bold text-foreground">تحدث مع دكتور حقيقي</div>
                <div className="text-xs text-muted-foreground">استشارة طبية مباشرة</div>
              </div>
            </CardHeader>
          </Card>

          {/* تحدث مع الذكاء الاصطناعي */}
          <Card 
            className="cursor-pointer hover:shadow-strong transition-all hover-scale animate-fade-in rounded-3xl border-0 shadow-medium hover-lift"
            onClick={() => navigate("/ai-chat")}
          >
            <CardHeader className="p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center hover-scale">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <div className="text-base font-bold text-foreground">تحدث مع الذكاء الاصطناعي</div>
                <div className="text-xs text-muted-foreground">استشارة فورية 24/7</div>
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
