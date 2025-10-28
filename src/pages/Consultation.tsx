import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, MessageCircle, Flag, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Consultation = () => {
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get("doctorId");
  const [doctor, setDoctor] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [reportText, setReportText] = useState("");
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [doctorId]);

  const loadData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate("/auth");
        return;
      }
      setUser(currentUser);

      // Load doctor
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("*, profiles(*)")
        .eq("id", doctorId)
        .single();
      setDoctor(doctorData);

      // Load wallet
      const { data: walletData } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();
      setWallet(walletData);

      // Load last transaction
      const { data: transactionData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setLastTransaction(transactionData);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startConsultation = async () => {
    if (!doctor || !wallet) return;

    if (wallet.balance < doctor.consultation_fee) {
      toast({
        title: "رصيد غير كافي",
        description: "يجب إضافة نقاط إلى محفظتك أولاً",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Perform the consultation atomically via RPC (generates a transaction id and handles wallet updates)
      const { data: rpcData, error: rpcError } = await supabase.rpc('perform_consultation', { _doctor_id: doctor.id });
      if (rpcError) throw rpcError;
      const newTxId = rpcData?.[0]?.tx_id || '';
      if (!newTxId) {
        throw new Error('فشل إنشاء رقم العملية');
      }

      setTransactionId(newTxId);
      setWallet(prev => ({ ...prev, balance: prev.balance - doctor.consultation_fee }));

      toast({
        title: "تم بدء الاستشارة بنجاح!",
        description: "يمكنك الآن التواصل مع الطبيب",
      });

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const reportDoctor = async () => {
    if (!reportText.trim()) return;

    try {
      const { error } = await supabase
        .from("doctor_reports")
        .insert({
          doctor_id: doctor.id,
          reporter_id: user.id,
          message: reportText,
        });

      if (error) throw error;

      toast({
        title: "تم إرسال التبليغ",
        description: "سيتم مراجعة التبليغ من قبل فريق الدعم",
      });

      setReportText("");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>لم يتم العثور على الطبيب</p>
          <Button onClick={() => navigate("/doctors")} className="mt-4">
            العودة للأطباء
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-28">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/doctors")} className="gap-2 mb-4 hover-lift">
            <ArrowRight className="w-4 h-4" />
            العودة للأطباء
          </Button>
        </div>

        {/* Success Alert */}
        {transactionId && (
          <Alert className="mb-6 border-green-200 bg-green-50 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <p className="font-semibold">تم بدء الاستشارة بنجاح!</p>
              <p>معرف العملية: {transactionId}</p>
              <p>يمكنك التواصل مع الطبيب عبر الواتساب:</p>
              <div className="mt-3">
                <a
                  href={`https://wa.me/${doctor.whatsapp_number}?text=مرحباً، أنا ${user?.email || ''}، معرف العملية: ${transactionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-2xl hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  فتح الواتساب
                </a>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Doctor Profile */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-light to-primary/80 text-white mb-8 shadow-strong animate-fade-in">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-28 h-28 md:w-32 md:h-32 rounded-3xl ring-4 ring-white/60 shadow-glow overflow-hidden flex-shrink-0">
                <AvatarImage src={doctor.image_url || doctor.profiles?.avatar_url || '/placeholder.svg'} className="object-cover" />
                <AvatarFallback className="text-2xl bg-white/20 text-white">
                  {doctor.doctor_name?.charAt(0) || "د"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-right">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{doctor.doctor_name}</h1>
                  {doctor.is_verified && (
                    <Badge className="bg-white/20 text-white border-white/30">
                      <CheckCircle2 className="w-3 h-3 ml-1" />
                      موثق
                    </Badge>
                  )}
                </div>
                <p className="text-white/90 text-base md:text-lg">{doctor.specialization_ar}</p>
                
                <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2 bg-white/20 rounded-2xl px-4 py-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{doctor.phone_number}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 rounded-2xl px-4 py-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{doctor.location || "مصر"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Doctor Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-card rounded-3xl p-6 shadow-medium animate-slide-in-up">
              <h3 className="font-bold text-xl mb-4">نبذة عن الطبيب</h3>
              <p className="text-muted-foreground leading-7">{doctor.bio_ar || "لا توجد معلومات إضافية"}</p>
            </div>

            {/* Consultation Details */}
            <div className="bg-card rounded-3xl p-6 shadow-medium animate-slide-in-up">
              <h3 className="font-bold text-xl mb-4">تفاصيل الاستشارة</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">سعر الاستشارة</span>
                  <span className="font-bold text-2xl text-primary">
                    {doctor.consultation_fee} نقطة
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-muted-foreground">رصيدك الحالي</span>
                  <span className="font-semibold">{wallet?.balance?.toFixed(0)} نقطة</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            {!transactionId && (
              <div className="bg-card rounded-3xl p-6 shadow-medium animate-slide-in-up">
                <h3 className="font-bold text-lg mb-4">بدء الاستشارة</h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-primary-light hover:shadow-glow rounded-2xl h-12 text-lg font-bold hover-scale"
                      disabled={processing || (wallet?.balance || 0) < doctor.consultation_fee}
                    >
                      {processing ? "جاري المعالجة..." : "بدء الاستشارة"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>تأكيد بدء الاستشارة</AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من بدء الاستشارة مع الدكتور {doctor.doctor_name}؟
                        <br />
                        سيتم خصم {doctor.consultation_fee} نقطة من محفظتك.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={startConsultation} className="bg-primary hover:bg-primary/90">
                        تأكيد
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* Report Doctor */}
            <div className="bg-card rounded-3xl p-6 shadow-medium animate-slide-in-up">
              <h3 className="font-bold text-lg mb-4">تبليغ عن الطبيب</h3>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full rounded-2xl h-12 hover-lift">
                    <Flag className="w-5 h-5 ml-2" />
                    تبليغ
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>تبليغ عن الطبيب</AlertDialogTitle>
                    <AlertDialogDescription>
                      اكتب سبب التبليغ وسيتم مراجعته من قبل فريق الدعم.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Textarea
                      placeholder="اكتب سبب التبليغ هنا..."
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      className="rounded-2xl min-h-[100px]"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={reportDoctor} className="bg-destructive hover:bg-destructive/90">
                      إرسال التبليغ
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Important Notes */}
            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 animate-slide-in-up">
              <h4 className="font-bold text-blue-900 mb-3">ملاحظات هامة:</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• بعد بدء الاستشارة، ستحصل على معرف عملية فريد</li>
                <li>• استخدم معرف العملية عند التواصل مع الطبيب</li>
                <li>• لا يمكن إلغاء الاستشارة بعد بدءها</li>
                <li>• في حالة وجود مشكلة، يمكنك التبليغ عن الطبيب</li>
              </ul>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>للدعم الفني: youssef.official.2411@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultation;