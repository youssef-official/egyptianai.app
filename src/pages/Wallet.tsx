import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Upload, Wallet as WalletIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const Wallet = () => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
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
      
      // Upload proof image
      const fileExt = proofImage.name.split('.').pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const path = `${user!.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deposit-proofs')
        .upload(path, proofImage);

      if (uploadError) throw uploadError;

      // Create deposit request
      await supabase
        .from("deposit_requests")
        .insert({
          user_id: user!.id,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          proof_image_url: path,
          status: "pending"
        });

      toast({
        title: "تم الإرسال!",
        description: "تم إرسال طلب الإيداع بنجاح. سيتم المراجعة قريباً.",
      });

      setAmount("");
      setPaymentMethod("");
      setProofImage(null);
      navigate("/");
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
            العودة
          </Button>
        </div>

        <Card className="shadow-strong animate-fade-in rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white rounded-t-3xl">
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="w-5 h-5" />
              إيداع رصيد
            </CardTitle>
            <CardDescription className="text-white/90">
              الرصيد الحالي: {wallet?.balance?.toFixed(2)} جنيه
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
                <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر طريقة الدفع..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vodafone">Vodafone Cash - 01108279642</SelectItem>
                    <SelectItem value="etisalat">Etisalat Cash - 01108279642</SelectItem>
                    <SelectItem value="telda">Telda - @youssef2413</SelectItem>
                    <SelectItem value="instapay">InstaPay - 5484460473322410</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof">إثبات الدفع (صورة)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <Input
                    id="proof"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                    className="hidden"
                    required
                  />
                  <label htmlFor="proof" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {proofImage ? proofImage.name : "اضغط لرفع صورة إثبات الدفع"}
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
      </div>
      <BottomNav />
    </div>
  );
};

export default Wallet;
