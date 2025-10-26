import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Bot, Wallet, LogOut } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await loadProfile(session.user.id);
    await loadWallet(session.user.id);
    await loadConsultations(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  };

  const loadWallet = async (userId: string) => {
    const { data } = await supabase.from("wallets").select("*").eq("user_id", userId).single();
    setWallet(data);
  };

  const loadConsultations = async (userId: string) => {
    const { data } = await supabase
      .from("consultations")
      .select("*, doctors(*)")
      .eq("user_id", userId)
      .order("consultation_date", { ascending: false })
      .limit(5);
    setConsultations(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "تم تسجيل الخروج", description: "نراك قريباً!" });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-strong">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">مرحباً، {profile?.full_name}</h1>
              <p className="text-xs text-muted-foreground">منصة الاستشارات الطبية الذكية</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="h-10 w-10 rounded-full p-0">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Wallet */}
        <Card className="mb-6 shadow-strong rounded-3xl overflow-hidden border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span>محفظتي</span>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <div className="text-center space-y-4">
              <div className="text-3xl font-bold text-primary">
                {wallet?.balance?.toFixed(2) || "0.00"} <span className="text-lg">جنيه</span>
              </div>
              <Button
                className="bg-gradient-to-r from-primary to-primary-light rounded-full h-10 px-6"
                onClick={() => navigate("/wallet")}
              >
                إيداع الأموال
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Button
            className="bg-gradient-to-r from-primary to-primary-light h-24 text-lg font-bold rounded-3xl flex flex-col gap-2"
            onClick={() => navigate("/doctors")}
          >
            <Stethoscope className="w-6 h-6" />
            التحدث مع دكتور حقيقي
          </Button>

          <Button
            variant="outline"
            className="h-24 text-lg font-bold rounded-3xl flex flex-col gap-2"
            onClick={() => navigate("/ai-consultation")}
          >
            <Bot className="w-6 h-6" />
            التحدث مع الذكاء الاصطناعي
          </Button>
        </div>

        {/* Consultations */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-center">آخر الاستشارات</h2>
          {consultations.length === 0 ? (
            <p className="text-center text-muted-foreground">لا توجد استشارات حالياً.</p>
          ) : (
            <div className="space-y-4">
              {consultations.map((c) => (
                <Card key={c.id} className="rounded-2xl border border-primary/20 shadow-sm p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{c.doctors?.doctor_name || "دكتور غير معروف"}</h3>
                    <p className="text-sm text-muted-foreground">{c.doctors?.specialization || ""}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(c.consultation_date).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <Button
                    className="bg-gradient-to-r from-primary to-primary-light"
                    onClick={() => navigate(`/consultation/${c.id}`)}
                  >
                    عرض
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
