import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Stethoscope, Wallet, Search, LogOut, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const DoctorDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkDoctor();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkDoctor = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    // Check if user is a doctor
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profile?.user_type !== "doctor") {
      navigate("/");
      return;
    }

    // Get doctor info
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    setDoctor(doctorData);

    // Get wallet
    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    setWallet(walletData);

    // Get transactions
    if (doctorData) {
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*, profiles(*)")
        .eq("doctor_id", doctorData.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setTransactions(transactionsData || []);
    }

    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchId) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("*, profiles(*)")
      .eq("id", searchId)
      .single();

    if (error || !data) {
      toast({
        title: "غير موجود",
        description: "لم يتم العثور على العملية",
        variant: "destructive",
      });
      setSearchResult(null);
    } else {
      setSearchResult(data);
      toast({
        title: "تم العثور!",
        description: "تم العثور على العملية",
      });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !doctor) return;

    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > parseFloat(wallet.balance)) {
      toast({
        title: "خطأ",
        description: "المبلغ غير صحيح أو أكبر من الرصيد المتاح",
        variant: "destructive",
      });
      return;
    }

    try {
      const commission = amount * 0.1;
      const netAmount = amount - commission;

      await supabase
        .from("withdraw_requests")
        .insert({
          doctor_id: doctor.id,
          amount: amount,
          net_amount: netAmount,
          commission: commission,
          status: "pending"
        });

      toast({
        title: "تم الإرسال!",
        description: `تم إرسال طلب السحب. المبلغ الصافي: ${netAmount.toFixed(2)} جنيه (بعد خصم عمولة 10%)`,
      });

      setWithdrawAmount("");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-medium">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">لوحة تحكم الدكتور</h1>
              <p className="text-sm text-muted-foreground">{doctor?.specialization_ar}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            تسجيل خروج
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-medium animate-slide-in-right">
            <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                الرصيد الحالي
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-5xl font-bold text-primary">
                  {wallet?.balance?.toFixed(2) || "0.00"} <span className="text-2xl">جنيه</span>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-primary to-primary-light">
                      طلب سحب
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="text-right">
                    <DialogHeader>
                      <DialogTitle>طلب سحب رصيد</DialogTitle>
                      <DialogDescription>
                        سيتم خصم عمولة 10% من المبلغ
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="withdrawAmount">المبلغ (جنيه)</Label>
                        <Input
                          id="withdrawAmount"
                          type="number"
                          min="1"
                          step="0.01"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          className="text-right"
                        />
                      </div>
                      {withdrawAmount && (
                        <div className="bg-secondary p-3 rounded-lg text-sm">
                          <p>المبلغ المطلوب: {parseFloat(withdrawAmount).toFixed(2)} جنيه</p>
                          <p>العمولة (10%): {(parseFloat(withdrawAmount) * 0.1).toFixed(2)} جنيه</p>
                          <p className="font-bold text-primary">
                            المبلغ الصافي: {(parseFloat(withdrawAmount) * 0.9).toFixed(2)} جنيه
                          </p>
                        </div>
                      )}
                      <Button onClick={handleWithdraw} className="w-full">
                        تأكيد طلب السحب
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium animate-slide-in-right">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                إجمالي الاستشارات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-primary">{transactions.length}</div>
                <p className="text-sm text-muted-foreground mt-2">استشارة مكتملة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Box */}
        <Card className="mb-8 shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              البحث بالعملية
            </CardTitle>
            <CardDescription>ابحث عن عملية باستخدام رقم العملية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="أدخل رقم العملية..."
                className="text-right"
              />
              <Button onClick={handleSearch}>بحث</Button>
            </div>
            {searchResult && (
              <div className="mt-4 p-4 bg-secondary rounded-lg">
                <p><strong>العميل:</strong> {searchResult.profiles?.full_name}</p>
                <p><strong>المبلغ:</strong> {searchResult.amount} جنيه</p>
                <p><strong>التاريخ:</strong> {new Date(searchResult.created_at).toLocaleString('ar-EG')}</p>
                <p><strong>الوصف:</strong> {searchResult.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>آخر الاستشارات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div>
                    <p className="font-semibold">{transaction.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString('ar-EG')}
                    </p>
                    <p className="text-xs text-muted-foreground">ID: {transaction.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{transaction.amount} جنيه</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">لا توجد استشارات بعد</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default DoctorDashboard;
