import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "react-i18next";

const Transfer = () => {
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setWallet(data);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiverId || !amount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    const transferAmount = parseFloat(amount);
    
    if (transferAmount <= 0) {
      toast({
        title: "خطأ",
        description: "المبلغ يجب أن يكون أكبر من صفر",
        variant: "destructive",
      });
      return;
    }

    if (wallet.balance < transferAmount) {
      toast({
        title: "رصيد غير كافٍ",
        description: "ليس لديك رصيد كافٍ لإتمام التحويل",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      const trimmedInput = receiverId.trim();
      let receiverProfile: { id: string; full_name?: string | null; email?: string | null } | null = null;

      if (trimmedInput.includes("@")) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .ilike("email", trimmedInput)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) throw new Error("لا يوجد مستخدم بهذا البريد الإلكتروني");
        receiverProfile = profile;
      } else {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", trimmedInput)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) throw new Error("لا يوجد مستخدم بهذا المعرف");
        receiverProfile = profile;
      }

      if (!receiverProfile) {
        throw new Error('تعذر تحديد المستخدم المستقبل');
      }

      const receiverUserId = receiverProfile.id;

      if (user.id === receiverUserId) throw new Error('لا يمكنك التحويل لنفسك');

      const { data: receiverWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', receiverUserId)
        .maybeSingle();

      if (!receiverWallet) throw new Error('محفظة المستقبل غير موجودة');

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      // Perform transfer via RPC to be atomic and generate ID
      const { data: rpcData, error } = await supabase.rpc('perform_transfer', { _receiver_id: receiverUserId, _amount: transferAmount });
      if (error) throw error;
      const transactionId = rpcData?.[0]?.tx_id || '';

      const notifications: Promise<unknown>[] = [];
      const walletUrl = `${window.location.origin}/wallet`;

      if (senderProfile?.email) {
        notifications.push(
          sendTransactionalEmail({
            type: "transfer_sent",
            to: senderProfile.email,
            data: {
              name: senderProfile.full_name || "",
              points: transferAmount,
              receiver_name: receiverProfile.full_name || receiverProfile.email || trimmedInput,
              receiver_email: receiverProfile.email || undefined,
              transaction_id: transactionId,
              cta_url: walletUrl,
              hero_badge_label: `${transferAmount.toLocaleString('ar-EG')} نقطة`,
              hero_badge_tone: "warning",
              footer_note: "إذا لم تكن أنت من أجريت هذه العملية يرجى التواصل مع فريق الدعم فوراً.",
            },
          }).catch((emailError) => console.error("Failed to send transfer sent email:", emailError))
        );
      }

      if (receiverProfile?.email) {
        notifications.push(
          sendTransactionalEmail({
            type: "transfer_received",
            to: receiverProfile.email,
            data: {
              name: receiverProfile.full_name || "",
              points: transferAmount,
              sender_name: senderProfile?.full_name || senderProfile?.email || "مستخدم من المنصة",
              sender_email: senderProfile?.email || undefined,
              transaction_id: transactionId,
              cta_url: walletUrl,
              hero_badge_label: `${transferAmount.toLocaleString('ar-EG')} نقطة`,
              hero_badge_tone: "success",
              footer_note: "يمكنك استخدام رصيدك الجديد فوراً داخل المنصة.",
            },
          }).catch((emailError) => console.error("Failed to send transfer received email:", emailError))
        );
      }

      if (notifications.length) {
        await Promise.allSettled(notifications);
      }

      toast({
        title: t('common.transfer'),
        description: `${t('common.transfer')}: ${transferAmount} ${t('common.points')}`,
      });

      setReceiverId("");
      setAmount("");
      loadWallet();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4 pb-24">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            {t('common.back')}
          </Button>
        </div>

        <Card className="shadow-strong animate-fade-in rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white rounded-t-3xl">
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              {t('transfer.title')}
            </CardTitle>
            <CardDescription className="text-white/90">
              {t('transfer.current')}: {wallet?.balance?.toFixed(0)} {t('common.points')}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleTransfer} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="receiverId">User ID أو البريد الإلكتروني</Label>
                <Input
                  id="receiverId"
                  type="text"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  placeholder="أدخل User ID أو البريد الإلكتروني للمستخدم..."
                  required
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">
                  ملاحظة: يمكنك إدخال معرف المستخدم أو البريد الإلكتروني، وسنحدد الحساب تلقائياً.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">{t('transfer.amountPts')}</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  required
                  className="text-right"
                />
              </div>

              <div className="bg-secondary p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">{t('common.language')}</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• تأكد من صحة معرف المستقبل قبل التحويل</li>
                  <li>• التحويل لا يمكن إلغاؤه بعد التأكيد</li>
                  <li>• يجب أن يكون لديك نقاط كافية</li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-light"
                disabled={loading}
              >
                {loading ? "..." : t('transfer.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Transfer;
