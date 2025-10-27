import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet as WalletIcon, TrendingUp, Bell, User, Eye, EyeOff, Plus, Heart, ArrowRightLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
// no alerts in wallet after moving deposit page

const Wallet = () => {
  // Deposit state handled in Deposit page
  const [wallet, setWallet] = useState<any>(null);
  // const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [doctor, setDoctor] = useState<any>(null);
  // const [showDeposit, setShowDeposit] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const paymentDetails: any = {
    vodafone: {
      name: "Vodafone Cash",
      icon: "https://cdn0.iconfinder.com/data/icons/circle-icons/512/vodafone.png",
      number: "01108279642",
      note: "افتح تطبيق فودافون كاش أو اطلب كود *9# ثم حوّل المبلغ إلى الرقم الموضح.",
    },
    etisalat: {
      name: "Etisalat Cash",
      icon: "https://images.seeklogo.com/logo-png/45/1/etisalat-logo-png_seeklogo-451518.png",
      number: "0118279642",
      note: "افتح تطبيق اتصالات كاش أو استخدم الكود *777# لتحويل المبلغ للرقم الموضح.",
    },
    telda: {
      name: "Telda",
      icon: "https://cdn.brandfetch.io/idBZNBQYTk/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1757255324312",
      number: "@youssef2413",
      note: "افتح تطبيق Telda ثم أرسل المبلغ إلى الحساب الموضح.",
    },
    instapay: {
      name: "InstaPay",
      icon: "https://upload.wikimedia.org/wikipedia/commons/2/20/InstaPay_Logo.png?20230411102327",
      number: "5484460473322410",
      note: "حوّل المبلغ عبر تطبيق Instapay إلى رقم البطاقة الموضح.\nاسم حامل البطاقة: YOUSSEF ELSAYED",
    },
  };

  useEffect(() => {
    loadWallet();
    loadContextAndHistory();
  }, []);

  const loadWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setWallet(data);
    }
  };

  const loadContextAndHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Detect if user is a doctor and get doctor id
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    setDoctor(doctorData);

    // Load recent transactions (RLS will restrict to user-related only)
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, profiles(full_name, avatar_url), doctors(doctor_name, image_url)')
      .order('created_at', { ascending: false })
      .limit(10);
    setTransactions(txData || []);

    // Load withdraw requests if doctor
    if (doctorData?.id) {
      const { data: wdData } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setWithdrawRequests(wdData || []);
    } else {
      setWithdrawRequests([]);
    }
  };

  const loadDepositRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setDepositRequests(data || []);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ البيانات بنجاح." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proofImage || !amount || !paymentMethod) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const fileExt = proofImage.name.split(".").pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const path = `${user!.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("deposit-proofs")
        .upload(path, proofImage);

      if (uploadError) throw uploadError;

      await supabase.from("deposit_requests").insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        proof_image_url: path,
        status: "pending",
      });

      // Send deposit received email
      try {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
        if (prof?.email) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
            },
            body: JSON.stringify({
              type: 'deposit_received',
              to: prof.email,
              data: { name: prof.full_name, amount: parseFloat(amount), method: paymentMethod }
            })
          });
        }
      } catch (_) {}

      toast({
        title: "تم الإرسال!",
        description: "تم إرسال طلب الإيداع بنجاح. سيتم المراجعة قريباً.",
      });

      setAmount("");
      setPaymentMethod("");
      setProofImage(null);
      loadDepositRequests();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDepositClick = () => {
    setShowDeposit(true);
    requestAnimationFrame(() => {
      const el = document.getElementById('deposit-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4 pb-24">
      <div className="container mx-auto max-w-2xl">
        {/* Header: greeting, profile icon (right) and notifications (left) */}
        <div className="mb-6 flex items-center justify-between">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">مرحباً،</p>
              <p className="text-sm font-semibold">{profile?.full_name || 'عزيزي المستخدم'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Balance Circle + Quick Actions */}
        <Card className="shadow-strong animate-fade-in rounded-3xl border-0 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">الرصيد</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBalance(!showBalance)}>
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-28 h-28">
                <div className="w-28 h-28 rounded-full border-8 border-primary/20 flex items-center justify-center animate-pulse-glow">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{showBalance ? (wallet?.balance?.toFixed(2) || '0.00') : '•••••'}</div>
                    <div className="text-xs text-muted-foreground">جنيه</div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(var(--primary) 360deg, transparent 0)' }} />
              </div>
              {/* Action buttons - three in a row */}
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center">
                  <Button onClick={handleDepositClick} className="rounded-full h-12 w-12 flex items-center justify-center shadow-medium">
                    <Plus className="w-5 h-5" />
                  </Button>
                  <span className="text-xs mt-2">شحن الرصيد</span>
                </div>
                <div className="flex flex-col items-center">
                  <Button onClick={() => navigate('/transfer')} variant="outline" className="rounded-full h-12 w-12 flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-xs mt-2">تحويل</span>
                </div>
                <div className="flex flex-col items-center">
                  <Button onClick={() => navigate('/doctors')} variant="secondary" className="rounded-full h-12 w-12 flex items-center justify-center">
                    <Heart className="w-5 h-5" />
                  </Button>
                  <span className="text-xs mt-2">المفضلة</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {depositRequests
          .filter((req) => req.admin_notes && req.status !== "pending")
          .map((req) => (
            <Alert key={req.id} className="mb-4 bg-blue-50 border-blue-200 animate-fade-in">
              <AlertDescription className="text-blue-900">
                <p className="font-semibold mb-1">ملاحظة من الإدارة:</p>
                <p className="text-sm">{req.admin_notes}</p>
                <p className="text-xs mt-2 text-blue-700">
                  المبلغ: {req.amount} جنيه -{" "}
                  {new Date(req.created_at).toLocaleDateString("ar-EG")}
                </p>
              </AlertDescription>
            </Alert>
          ))}

        {showDeposit && (
        <Card id="deposit-section" className="shadow-strong animate-fade-in rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white rounded-t-3xl">
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="w-5 h-5" />
              إيداع رصيد
            </CardTitle>
            <CardDescription className="text-white/90">
              الرصيد الحالي: {wallet?.balance?.toFixed(2) || 0} جنيه
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (جنيه)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  required
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">طريقة الدفع</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  required
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر طريقة الدفع..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                    <SelectItem value="etisalat">Etisalat Cash</SelectItem>
                    <SelectItem value="telda">Telda</SelectItem>
                    <SelectItem value="instapay">InstaPay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-right space-y-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={paymentDetails[paymentMethod].icon}
                      alt={paymentDetails[paymentMethod].name}
                      className="w-8 h-8 rounded-full"
                    />
                    <h3 className="font-semibold text-blue-900">
                      {paymentDetails[paymentMethod].name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between bg-white p-3 rounded-md border">
                    <span className="font-mono text-blue-800">
                      {paymentDetails[paymentMethod].number}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(paymentDetails[paymentMethod].number)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="w-4 h-4" /> نسخ
                    </Button>
                  </div>

                  <p className="text-sm text-blue-800 whitespace-pre-line">
                    {paymentDetails[paymentMethod].note}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="proof">إثبات الدفع (صورة)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors" aria-describedby={undefined}>
                  <Input
                    id="proof"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setProofImage(e.target.files?.[0] || null)
                    }
                    className="hidden"
                    required
                  />
                  <label
                    htmlFor="proof"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {proofImage
                        ? proofImage.name
                        : "اضغط لرفع صورة إثبات الدفع"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-secondary p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">ملاحظات هامة:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• سيتم مراجعة طلبك خلال 24 ساعة</li>
                  <li>• تأكد من رفع صورة واضحة لإثبات الدفع</li>
                  <li>• 1 جنيه = 1 نقطة</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary-light"
                disabled={loading}
              >
                {loading ? "جاري الإرسال..." : "إرسال طلب الإيداع"}
              </Button>
            </form>
          </CardContent>
        </Card>
        )}

        {/* Recent Payments */}
        <Card className="shadow-medium animate-fade-in rounded-3xl border-0 mt-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>المدفوعات الأخيرة</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAllHistory(true)}>الكل</Button>
            </div>
            <CardDescription>آخر الحركات على حسابك</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0,5).map((t) => renderTxItem(t))}
              {transactions.length === 0 && (
                <p className="text-center text-muted-foreground py-6">لا توجد عمليات بعد</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Full History Tabs */}
        {showAllHistory && (
        <Card className="shadow-medium animate-fade-in rounded-3xl border-0 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              السجل
            </CardTitle>
            <CardDescription>كل العمليات والطلبات الأخيرة</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid grid-cols-3 md:grid-cols-4 w-full mb-3">
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="transfers">التحويلات</TabsTrigger>
                <TabsTrigger value="consultations">الاستشارات</TabsTrigger>
                {doctor && <TabsTrigger value="withdrawals">السحب</TabsTrigger>}
              </TabsList>

              <TabsContent value="all">
                <div className="space-y-3">
                  {transactions.map((t) => renderTxItem(t))}
                  {transactions.length === 0 && <p className="text-center text-muted-foreground py-6">لا توجد عمليات بعد</p>}
                </div>
              </TabsContent>
              <TabsContent value="transfers">
                <div className="space-y-3">
                  {transactions.filter(t => t.type === 'transfer').map((t) => renderTxItem(t))}
                  {transactions.filter(t => t.type === 'transfer').length === 0 && <p className="text-center text-muted-foreground py-6">لا توجد تحويلات</p>}
                </div>
              </TabsContent>
              <TabsContent value="consultations">
                <div className="space-y-3">
                  {transactions.filter(t => t.type === 'consultation').map((t) => renderTxItem(t))}
                  {transactions.filter(t => t.type === 'consultation').length === 0 && <p className="text-center text-muted-foreground py-6">لا توجد استشارات</p>}
                </div>
              </TabsContent>
              {doctor && (
                <TabsContent value="withdrawals">
                  <div className="space-y-3">
                    {withdrawRequests.map((r) => (
                      <div key={r.id} className="p-3 bg-secondary rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-medium">الصافي: {r.net_amount} ج</p>
                          <p className="text-xs text-muted-foreground">العمولة: {r.commission} ج • {new Date(r.created_at).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <span className={`text-sm font-semibold ${r.status === 'approved' ? 'text-green-600' : r.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`}>{r.status}</span>
                      </div>
                    ))}
                    {withdrawRequests.length === 0 && (
                      <p className="text-center text-muted-foreground py-6">لا توجد طلبات سحب</p>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
        )}

        
      </div>
      <BottomNav />
    </div>
  );

  function renderTxItem(t: any) {
    const amount = Number(t.amount);
    let sign = '-';
    let color = 'text-destructive';
    if (t.type === 'transfer' && t.receiver_id === wallet?.user_id) { sign = '+'; color = 'text-green-600'; }
    if (t.type === 'consultation' && doctor && t.doctor_id === doctor.id) { sign = '+'; color = 'text-green-600'; }
    return (
      <div key={t.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{t.type === 'consultation' ? 'استشارة' : t.type === 'transfer' ? 'تحويل' : t.type}</p>
          <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString('ar-EG')} • ID: {t.id}</p>
        </div>
        <div className={`text-lg font-bold ${color}`}>
          {sign}{amount.toFixed(2)} ج
        </div>
      </div>
    );
  }
};

export default Wallet;
