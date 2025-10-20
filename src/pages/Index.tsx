import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Wallet, MessageSquare, LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    setProfile(profileData);
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
        <div className="animate-pulse text-primary text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-medium">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">مرحباً، {profile?.full_name}</h1>
              <p className="text-sm text-muted-foreground">منصة الاستشارات الطبية</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            تسجيل خروج
          </Button>
        </div>

        {/* Wallet Card */}
        <Card className="mb-8 shadow-medium animate-slide-in-right">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              محفظتي
            </CardTitle>
            <CardDescription className="text-white/90">
              الرصيد الحالي
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-primary">
                {wallet?.balance?.toFixed(2) || "0.00"} <span className="text-2xl">جنيه</span>
              </div>
              <div className="flex gap-4 justify-center">
                <Button 
                  className="bg-gradient-to-r from-primary to-primary-light hover:shadow-glow"
                  onClick={() => navigate("/wallet")}
                >
                  إيداع رصيد
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/transfer")}
                >
                  تحويل رصيد
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-strong transition-all hover:-translate-y-1 animate-fade-in"
            onClick={() => navigate("/doctors")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                تحدث مع دكتور حقيقي
              </CardTitle>
              <CardDescription>
                اختر التخصص المناسب وابدأ المحادثة مع طبيب متخصص
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-strong transition-all hover:-translate-y-1 animate-fade-in"
            onClick={() => navigate("/profile")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                حسابي
              </CardTitle>
              <CardDescription>
                عرض وتعديل معلومات الحساب الشخصي
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>© 2025 AI Egyptian Doctor. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
