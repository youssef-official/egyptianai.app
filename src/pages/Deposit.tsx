import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Copy, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

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

const Deposit = () => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/auth');
    })();
  }, [navigate]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ البيانات بنجاح." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImage || !amount || !paymentMethod) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = proofImage.name.split(".").pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const path = `${user!.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("deposit-proofs").upload(path, proofImage);
      if (uploadError) throw uploadError;

      await supabase.from("deposit_requests").insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        proof_image_url: path,
        status: "pending",
      });

      if (user?.email) {
        const parsedAmount = parseFloat(amount);
        await sendTransactionalEmail({
          type: "deposit_received",
          to: user.email,
          data: {
            name: user.user_metadata?.full_name || "",
            amount: parsedAmount,
            method: paymentMethod,
            cta_label: "متابعة حالة الطلب",
            cta_url: `${window.location.origin}/wallet`,
            hero_badge_label: `${parsedAmount.toLocaleString("ar-EG")} جنيه`,
            hero_badge_tone: "info",
            footer_note: "يتم مراجعة طلبات الإيداع خلال 24 ساعة عمل، وسيصلك إشعار فور اعتماد العملية.",
          },
        }).catch((emailError) => {
          console.error("Failed to send deposit received email:", emailError);
        });
      }

      toast({ title: "تم الإرسال!", description: "تم إرسال طلب الإيداع بنجاح." });
      navigate('/wallet');
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/wallet")} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            {t('common.back')}
          </Button>
        </div>
        <Card className="shadow-strong animate-fade-in rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white rounded-t-3xl">
            <CardTitle>{t('deposit.title')}</CardTitle>
            <CardDescription className="text-white/90">{t('deposit.chooseAndUpload')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('deposit.amountPts')}</Label>
                <Input id="amount" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" required className="text-right" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
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
                    <img src={paymentDetails[paymentMethod].icon} alt={paymentDetails[paymentMethod].name} className="w-8 h-8 rounded-full" />
                    <h3 className="font-semibold text-blue-900">{paymentDetails[paymentMethod].name}</h3>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-md border">
                    <span className="font-mono text-blue-800">{paymentDetails[paymentMethod].number}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleCopy(paymentDetails[paymentMethod].number)} className="flex items-center gap-1">
                      <Copy className="w-4 h-4" /> نسخ
                    </Button>
                  </div>
                  <p className="text-sm text-blue-800 whitespace-pre-line">{paymentDetails[paymentMethod].note}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="proof">إثبات الدفع (صورة)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <Input id="proof" type="file" accept="image/*" onChange={(e) => setProofImage(e.target.files?.[0] || null)} className="hidden" required />
                  <label htmlFor="proof" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{proofImage ? proofImage.name : "اضغط لرفع صورة إثبات الدفع"}</span>
                  </label>
                </div>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-primary-light" disabled={loading}>
                {loading ? "..." : t('deposit.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Deposit;
