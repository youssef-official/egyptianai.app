import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Transfer = () => {
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      // Check if receiver exists
      const { data: receiverWallet, error: receiverError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", receiverId)
        .single();

      if (receiverError || !receiverWallet) {
        throw new Error("المستخدم المستقبل غير موجود");
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user!.id === receiverId) {
        throw new Error("لا يمكنك التحويل لنفسك");
      }

      // Deduct from sender
      const newSenderBalance = parseFloat(wallet.balance) - transferAmount;
      await supabase
        .from("wallets")
        .update({ balance: newSenderBalance })
        .eq("id", wallet.id);

      // Add to receiver
      const newReceiverBalance = parseFloat(receiverWallet.balance) + transferAmount;
      await supabase
        .from("wallets")
        .update({ balance: newReceiverBalance })
        .eq("id", receiverWallet.id);

      // Create transaction
      const transactionId = `TR${Date.now()}`;
      await supabase
        .from("transactions")
        .insert({
          id: transactionId,
          user_id: user!.id,
          receiver_id: receiverId,
          amount: transferAmount,
          type: "transfer",
          description: "تحويل رصيد"
        });

      toast({
        title: "تم التحويل!",
        description: `تم تحويل ${transferAmount} جنيه بنجاح`,
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            العودة
          </Button>
        </div>

        <Card className="shadow-strong animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              تحويل رصيد
            </CardTitle>
            <CardDescription className="text-white/90">
              الرصيد الحالي: {wallet?.balance?.toFixed(2)} جنيه
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleTransfer} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="receiverId">معرّف المستقبل (User ID)</Label>
                <Input
                  id="receiverId"
                  type="text"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  placeholder="أدخل معرّف المستخدم..."
                  required
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">
                  يمكن الحصول على المعرف من المستخدم المستقبل
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (جنيه)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="text-right"
                />
              </div>

              <div className="bg-secondary p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">ملاحظات هامة:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• تأكد من صحة معرف المستقبل قبل التحويل</li>
                  <li>• التحويل لا يمكن إلغاؤه بعد التأكيد</li>
                  <li>• يجب أن يكون لديك رصيد كافٍ</li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-light"
                disabled={loading}
              >
                {loading ? "جاري التحويل..." : "تحويل الرصيد"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transfer;
