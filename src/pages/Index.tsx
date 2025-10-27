import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Stethoscope, Wallet, LogOut, Bot, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import FeaturedDoctors from "@/components/FeaturedDoctors";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentConsultations, setRecentConsultations] = useState<any[]>([]);
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

    const { data: consultationsData } = await supabase
      .from("consultations")
      .select("*, doctors(doctor_name, image_url, specialization_ar), medical_departments(name_ar)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    setProfile(profileData);
    setWallet(walletData);
    setRecentConsultations(consultationsData || []);
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

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card 
            className="cursor-pointer hover:shadow-strong transition-all hover:scale-[1.02] animate-fade-in rounded-3xl border-0 shadow-medium"
            onClick={() => navigate("/wallet")}
          >
            <CardHeader className="p-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-primary" />
                </div>
                <div className="text-sm font-semibold">المحفظة</div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-strong transition-all hover:scale-[1.02] animate-fade-in rounded-3xl border-0 shadow-medium"
            onClick={() => navigate("/transfer")}
          >
            <CardHeader className="p-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <ArrowRight className="w-7 h-7 text-primary" />
                </div>
                <div className="text-sm font-semibold">تحويل</div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <FeaturedDoctors />

        {/* Recent Consultations */}
        {recentConsultations.length > 0 && (
          <Card className="mb-6 shadow-medium rounded-3xl border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">آخر الاستشارات</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentConsultations.map((consultation) => (
                <div key={consultation.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/10 to-primary-light/10 rounded-2xl hover:shadow-strong transition-all border border-primary/20">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={consultation.doctors?.image_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white">
                      {consultation.doctors?.doctor_name?.charAt(0) || 'د'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{consultation.doctors?.doctor_name}</p>
                      <Badge variant="default" className="text-[10px]">{consultation.medical_departments?.name_ar}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{consultation.doctors?.specialization_ar}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(consultation.created_at).toLocaleDateString('ar-EG')}
                      </span>
                      <span className="text-xs font-mono text-primary">#{consultation.id}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary">{consultation.amount} ج</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
