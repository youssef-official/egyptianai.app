import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Lock, Phone, Image as ImageIcon, FileText } from "lucide-react";
import { motion } from "framer-motion";

const HospitalAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [ownershipDoc, setOwnershipDoc] = useState<File | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (!data.session) {
          throw new Error("فشل إنشاء جلسة تسجيل الدخول");
        }

        if (data.user) {
          const { data: hospital } = await supabase
            .from("hospitals")
            .select("*")
            .eq("user_id", data.user.id)
            .single();

          if (hospital) {
            if (!hospital.is_approved) {
              toast({
                title: "في انتظار الموافقة",
                description: "حسابك قيد المراجعة من قبل الإدارة",
              });
              navigate("/hospital-pending");
              return;
            }

            toast({
              title: "مرحباً بعودتك!",
              description: "تم تسجيل الدخول بنجاح",
            });
            navigate("/hospital-dashboard");
            return;
          }

          const { data: hospitalDoctor } = await supabase
            .from("hospital_doctors")
            .select("*")
            .eq("doctor_email", email)
            .eq("doctor_password", password)
            .single();

          if (hospitalDoctor) {
            toast({
              title: "مرحباً د. " + hospitalDoctor.doctor_name,
              description: "تم تسجيل الدخول بنجاح",
            });
            navigate("/hospital-doctor-dashboard");
            return;
          }

          // Fallback: if hospital record is missing but request is approved, create it now
          const { data: approvedReq } = await supabase
            .from('hospital_requests')
            .select('*')
            .eq('user_id', data.user.id)
            .eq('status', 'approved')
            .maybeSingle();

          if (approvedReq) {
            const { error: createHospitalError } = await supabase
              .from('hospitals')
              .insert({
                user_id: data.user.id,
                name: approvedReq.hospital_name,
                email: approvedReq.email,
                phone: approvedReq.phone,
                logo_url: approvedReq.logo_url || null,
                is_approved: true,
                is_active: true,
              });

            if (!createHospitalError) {
              toast({ title: "تم تفعيل حساب المستشفى", description: "تم إنشاء ملف المستشفى تلقائياً" });
              navigate('/hospital-dashboard');
              return;
            }
          }

          toast({
            title: "خطأ",
            description: "لم يتم العثور على حساب المستشفى",
            variant: "destructive",
          });
          await supabase.auth.signOut();
        }
      } else {
        if (!ownershipDoc) {
          toast({
            title: "خطأ",
            description: "يرجى رفع مستند ملكية المستشفى",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: hospitalName,
              user_type: "hospital",
            },
            emailRedirectTo: `${window.location.origin}/hospital-pending`,
          },
        });

        if (error) throw error;

        if (data.user && data.session) {
          await supabase.auth.setSession(data.session);

          const fileExt = ownershipDoc.name.split(".").pop();
          const fileName = `${data.user.id}-${Date.now()}.${fileExt}`;
          const filePath = `${data.user.id}/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from("hospital-documents")
            .upload(filePath, ownershipDoc, { upsert: false });

          if (uploadError) throw uploadError;

          const { error: requestError } = await supabase
            .from("hospital_requests")
            .insert({
              user_id: data.user.id,
              hospital_name: hospitalName,
              email,
              phone,
              logo_url: logoUrl || null,
              ownership_docs_url: filePath,
            });

          if (requestError) throw requestError;

          toast({
            title: "تم إرسال الطلب بنجاح! 🎉",
            description: "سيتم مراجعة طلبك والرد عليك قريباً",
          });

          navigate("/hospital-pending");
        }
      }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-cyan-100 to-white flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="w-full max-w-md">
        <Card className="w-full shadow-strong rounded-3xl border-0 hover-lift bg-white/80 backdrop-blur">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-glow animate-pulse-glow">
              <Building2 className="w-14 h-14 text-white" />
            </div>
            <CardTitle className="text-3xl font-extrabold text-foreground">
              {isLogin ? "تسجيل دخول المستشفى" : "تسجيل مستشفى جديد"}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {isLogin ? "سجل دخولك لإدارة المستشفى" : "انضم إلى شبكتنا من المستشفيات"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold">
                  <Mail className="w-4 h-4" />
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-right rounded-2xl transition-all h-12 border-2 focus:border-primary"
                  placeholder="hospital@example.com"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="w-4 h-4" />
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-right rounded-2xl transition-all h-12 border-2 focus:border-primary"
                  minLength={6}
                />
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="hospitalName" className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="w-4 h-4" />
                      اسم المستشفى
                    </Label>
                    <Input
                      id="hospitalName"
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      required
                      className="text-right rounded-2xl h-12"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold">
                      <Phone className="w-4 h-4" />
                      رقم الهاتف
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="text-right rounded-2xl h-12"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="logoUrl" className="flex items-center gap-2 text-sm font-semibold">
                      <ImageIcon className="w-4 h-4" />
                      رابط الشعار (اختياري)
                    </Label>
                    <Input
                      id="logoUrl"
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="text-right rounded-2xl h-12"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="ownershipDoc" className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="w-4 h-4" />
                      مستند الملكية (عقد/ترخيص)
                    </Label>
                    <Input
                      id="ownershipDoc"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setOwnershipDoc(e.target.files?.[0] || null)}
                      required
                      className="rounded-2xl h-12"
                    />
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:shadow-glow transition-all rounded-2xl h-14 text-lg font-bold hover-scale"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-block w-6 h-6 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                ) : (
                  isLogin ? "تسجيل الدخول" : "إرسال الطلب"
                )}
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full text-primary hover:text-primary/80 font-semibold"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "مستشفى جديد؟ سجل الآن" : "لديك حساب؟ سجل دخولك"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default HospitalAuth;
