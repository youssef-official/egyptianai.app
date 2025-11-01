import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DoctorApplication = () => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [certificate, setCertificate] = useState<File | null>(null);
  const [idCardFront, setIdCardFront] = useState<File | null>(null);
  const [idCardBack, setIdCardBack] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkExistingRequest();
  }, []);

  const checkExistingRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("doctor_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setExistingRequest(data);
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${folder}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('doctor-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!certificate || !idCardFront || !idCardBack) {
      toast({
        title: "خطأ",
        description: "يرجى رفع جميع المستندات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const certificateUrl = await uploadFile(certificate, 'certificates');
      const idCardFrontUrl = await uploadFile(idCardFront, 'id-cards');
      const idCardBackUrl = await uploadFile(idCardBack, 'id-cards');

      await supabase
        .from("doctor_requests")
        .insert({
          user_id: user!.id,
          full_name: fullName,
          phone,
          specialization,
          certificate_url: certificateUrl,
          id_card_front_url: idCardFrontUrl,
          id_card_back_url: idCardBackUrl,
        });

      if (user?.email) {
        await sendTransactionalEmail({
          type: "doctor_request_received",
          to: user.email,
          data: {
            name: fullName,
            specialization,
            hero_badge_label: "قيد المراجعة",
            hero_badge_tone: "info",
            cta_url: `${window.location.origin}/doctor-application`,
            footer_note: "سنقوم بمراجعة طلبك خلال 24 ساعة عمل، وسنبلغك فوراً عند اتخاذ القرار.",
          },
        }).catch((emailError) => {
          console.error("Failed to send doctor request received email:", emailError);
        });
      }

      toast({
        title: "تم إرسال الطلب!",
        description: "سيتم مراجعة طلبك قريباً وإرسال إيميل بالنتيجة",
      });

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

  if (existingRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ArrowRight className="w-4 h-4" />
              العودة
            </Button>
          </div>

          <Card className="shadow-strong rounded-3xl border-0">
            <CardHeader>
              <CardTitle>حالة طلب الدخول كطبيب</CardTitle>
              <CardDescription>لديك طلب سابق بحالة: {existingRequest.status}</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className={
                existingRequest.status === 'approved' ? 'bg-green-50 border-green-200' :
                existingRequest.status === 'rejected' ? 'bg-red-50 border-red-200' :
                'bg-blue-50 border-blue-200'
              }>
                <AlertDescription>
                  {existingRequest.status === 'pending' && (
                    <p>طلبك قيد المراجعة. سيتم إرسال إيميل بالنتيجة قريباً.</p>
                  )}
                  {existingRequest.status === 'approved' && (
                    <p>تم قبول طلبك! يمكنك الآن الوصول إلى لوحة تحكم الطبيب.</p>
                  )}
                  {existingRequest.status === 'rejected' && (
                    <>
                      <p className="font-semibold mb-2">تم رفض طلبك</p>
                      {existingRequest.admin_notes && (
                        <p className="text-sm">السبب: {existingRequest.admin_notes}</p>
                      )}
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {existingRequest.status === 'approved' && (
                <Button 
                  onClick={() => navigate("/doctor-dashboard")}
                  className="w-full mt-4 bg-gradient-to-r from-primary to-primary-light"
                >
                  الذهاب إلى لوحة التحكم
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            العودة
          </Button>
        </div>

        <Card className="shadow-strong rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white rounded-t-3xl">
            <CardTitle>طلب الدخول كطبيب</CardTitle>
            <CardDescription className="text-white/90">
              يرجى ملء البيانات وإرفاق المستندات المطلوبة
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل..."
                  required
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  required
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">التخصص</Label>
                <Input
                  id="specialization"
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="مثال: طب الأسنان، الجلدية..."
                  required
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificate" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  شهادة التخصص الطبي (PDF أو صورة)
                </Label>
                <Input
                  id="certificate"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setCertificate(e.target.files?.[0] || null)}
                  required
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idCardFront" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  صورة البطاقة الشخصية (الأمام)
                </Label>
                <Input
                  id="idCardFront"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdCardFront(e.target.files?.[0] || null)}
                  required
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idCardBack" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  صورة البطاقة الشخصية (الخلف)
                </Label>
                <Input
                  id="idCardBack"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdCardBack(e.target.files?.[0] || null)}
                  required
                  className="text-right"
                />
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-900 text-sm">
                  <p className="font-semibold mb-2">ملاحظات هامة:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• يجب أن تكون الصور واضحة وقابلة للقراءة</li>
                    <li>• سيتم مراجعة طلبك خلال 24-48 ساعة</li>
                    <li>• سيتم إرسال إيميل بالنتيجة على بريدك الإلكتروني</li>
                    <li>• المستندات المرفوعة محمية وسرية</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-light h-12"
                disabled={loading}
              >
                {loading ? "جاري الإرسال..." : "إرسال الطلب"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorApplication;