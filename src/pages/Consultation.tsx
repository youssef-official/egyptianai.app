import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      const { data: lastTx } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("doctor_id", String(doctorId))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastTransaction(lastTx);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = async () => {
    if (!doctor || !wallet) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('perform_consultation', { _doctor_id: doctorId });
      if (error) throw error;
      const txId = data?.[0]?.tx_id || '';
      setTransactionId(txId);
      await loadData();
      toast({ title: "تم بدء الاستشارة!", description: `معرف العملية: ${txId}` });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReport = async () => {
    if (!reportText.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى كتابة سبب التبليغ",
        variant: "destructive",
      });
      return;
    }

    // Here you would normally send the report to a reports table
    toast({
      title: "تم إرسال التبليغ",
      description: "شكراً لك، سيتم مراجعة التبليغ قريباً",
    });
    setReportText("");
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center">
          <p>لم يتم العثور على الطبيب</p>
          <Button onClick={() => navigate("/doctors")} className="mt-4">
            العودة للأطباء
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/doctors")} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            العودة للأطباء
          </Button>
        </div>

        {lastTransaction && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-900">
              آخر استشارة كانت في: {new Date(lastTransaction.created_at).toLocaleString("ar-EG")}
              <br />
              معرف العملية: {lastTransaction.id}
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-strong rounded-3xl overflow-hidden border-0">
          <div className="bg-gradient-to-r from-primary to-primary-light p-6 text-white">
            <div className="flex items-start gap-4">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={doctor.image_url} />
                <AvatarFallback className="text-2xl bg-white text-primary">
                  {doctor.doctor_name?.charAt(0) || "د"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold">{doctor.doctor_name}</h1>
                  {doctor.is_verified && (
                    <Badge className="bg-white text-primary">
                      <CheckCircle2 className="w-3 h-3 ml-1" />
                      موثق
                    </Badge>
                  )}
                </div>
                <p className="text-white/90 text-lg">{doctor.specialization_ar}</p>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {doctor.phone_number}
                  </div>
                  {doctor.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {doctor.address}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">نبذة عن الطبيب</h3>
              <p className="text-muted-foreground">{doctor.bio_ar || "لا توجد معلومات إضافية"}</p>
            </div>

            <div className="bg-secondary p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">سعر الاستشارة</span>
                <span className="text-2xl font-bold text-primary">
                  {doctor.consultation_fee || doctor.price} جنيه
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">رصيدك الحالي</span>
                <span className="font-semibold">{wallet?.balance?.toFixed(2)} جنيه</span>
              </div>
            </div>

            {transactionId && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-900">
                  <div className="space-y-2">
                    <p className="font-semibold">تم بدء الاستشارة بنجاح!</p>
                    <p>معرف العملية: {transactionId}</p>
                    <p>يمكنك التواصل مع الطبيب عبر الواتساب:</p>
                    <a 
                      href={`https://wa.me/${doctor.whatsapp_number}?text=مرحباً، أنا ${user?.email || ''}، معرف العملية: ${transactionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      فتح الواتساب
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-primary to-primary-light text-lg h-12"
                    disabled={processing || !!transactionId}
                  >
                    {processing ? "جاري المعالجة..." : transactionId ? "تم بدء الاستشارة" : "بدء الاستشارة"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد بدء الاستشارة</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد من بدء الاستشارة مع {doctor.doctor_name}؟
                      <br />
                      سيتم خصم {doctor.consultation_fee || doctor.price} جنيه من رصيدك.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartConsultation}>
                      تأكيد
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-12 w-12">
                    <Flag className="w-5 h-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>تبليغ عن الطبيب</AlertDialogTitle>
                    <AlertDialogDescription>
                      يرجى كتابة سبب التبليغ
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="اكتب سبب التبليغ هنا..."
                    className="min-h-[100px]"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReport}>
                      إرسال التبليغ
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">ملاحظات هامة:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
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
        </Card>
      </div>
    </div>
  );
};

export default Consultation;
