import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Stethoscope, Wallet, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(5);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    initUser();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id, limit);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, limit]);

  const initUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
      await loadUserData(session.user.id, limit);
    }
    setLoading(false);
  };

  const loadUserData = async (userId: string, lim: number) => {
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
      .select("*, doctors(*)")
      .eq("user_id", userId)
      .order("consultation_date", { ascending: false })
      .limit(lim);

    setProfile(profileData);
    setWallet(walletData);
    setConsultations(consultationsData || []);
    setHasMore((consultationsData?.length || 0) >= lim);
  };

  const loadMore = () => {
    setLimit((prev) => prev + 5);
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
        <div className="flex items-center justify-between mb-6">
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

        {/* Wallet Card */}
        <Card className="mb-6 shadow-strong rounded-3xl overflow-hidden border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white pb-4">
            <div className="flex items-center gap-2 text-base">
              <Wallet className="w-5 h-5" />
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
                  onClick={() => navigate("/wallet")}
                >
                  إيداع
                </Button>
                <Button 
                  variant="outline"
                  className="rounded-full h-10 px-6"
                  onClick={() => navigate("/transfer")}
                >
                  تحويل
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Consultations */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">آخر الاستشارات</h2>
          {consultations.length === 0 ? (
            <p className="text-center text-muted-foreground">لم تقم بأي استشارة بعد.</p>
          ) : (
            <div className="space-y-4">
              {consultations.map((c) => (
                <Card key={c.id} className="shadow-medium border-0 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{c.doctors?.doctor_name || "دكتور مجهول"}</h3>
                    <p className="text-sm text-muted-foreground">{c.doctors?.specialization || ""}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      تاريخ الاستشارة: {new Date(c.consultation_date).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <Button 
                    className="bg-gradient-to-r from-primary to-primary-light"
                    onClick={() => navigate(`/consultation/${c.id}`)}
                  >
                    عرض التفاصيل
                  </Button>
                </Card>
              ))}
            </div>
          )}
          {hasMore && consultations.length > 0 && (
            <div className="mt-4 text-center">
              <Button 
                variant="outline"
                className="rounded-full"
                onClick={loadMore}
              >
                تحميل المزيد
              </Button>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
