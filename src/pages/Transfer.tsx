import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
      // Resolve receiver as exact user_id only for now
      const receiverUserId = receiverId;

      const { data: receiverWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', receiverUserId)
        .maybeSingle();

      if (!receiverWallet) throw new Error('المستخدم المستقبل غير موجود');

      const { data: { user } } = await supabase.auth.getUser();
      if (user!.id === receiverUserId) throw new Error('لا يمكنك التحويل لنفسك');

      // Perform transfer via RPC to be atomic and generate ID
      const { data: rpcData, error } = await supabase.rpc('perform_transfer', { _receiver_id: receiverUserId, _amount: transferAmount });
      if (error) throw error;
      const transactionId = rpcData?.[0]?.tx_id || '';

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
                <Label htmlFor="receiverId">User ID</Label>
                <Input
                  id="receiverId"
                  type="text"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  placeholder="أدخل User ID للمستخدم..."
                  required
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">
                  ملاحظة: حالياً نقبل User ID فقط لضمان الدقة
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
