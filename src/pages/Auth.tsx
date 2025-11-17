import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Mail, Lock, User, Phone, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showExtraFields, setShowExtraFields] = useState(false);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [userType, setUserType] = useState<"user" | "doctor">("user");
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

        if (data.user) {
          toast({
            title: "مرحباً بك!",
            description: "تم تسجيل الدخول بنجاح",
          });

          // Wait for profile data to be available
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("user_type")
              .eq("id", data.user.id)
              .single();

            if (profile?.user_type === "doctor") {
              navigate("/doctor-dashboard");
            } else {
              navigate("/");
            }
          }, 500);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
              referral_source: referralSource,
              user_type: userType,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        // Send welcome email
        if (data.user) {
          try {
            await sendTransactionalEmail({
              type: "welcome",
              to: email,
              data: {
                name: fullName,
              },
            });
          } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
          }
        }

        toast({
          title: "تم إنشاء الحساب بنجاح! 🎉",
          description: "تحقق من بريدك الإلكتروني لتأكيد حسابك. بعد التأكيد، يمكنك تسجيل الدخول والبدء في استخدام المنصة.",
        });
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
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-100 via-pink-100 to-white flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="w-full max-w-md">
      <Card className="w-full shadow-strong rounded-3xl border-0 hover-lift bg-white/80 backdrop-blur">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-glow animate-pulse-glow">
            <Stethoscope className="w-14 h-14 text-white" />
          </div>
          <CardTitle className="text-3xl font-extrabold text-foreground">
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {isLogin ? t('auth.login') : t('auth.signup')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="w-4 h-4" />
                {t('auth.email')}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-right rounded-2xl transition-all h-12 border-2 focus:border-primary"
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold">
                <Lock className="w-4 h-4" />
                {t('auth.password')}
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

            <div className={`space-y-4 overflow-hidden transition-all duration-500 ${!isLogin && showExtraFields ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  الاسم الكامل
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="text-right rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  رقم الهاتف
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required={!isLogin}
                  className="text-right rounded-2xl"
                  placeholder="01XXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral" className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  من أين سمعت عنا؟
                </Label>
                <Select value={referralSource} onValueChange={setReferralSource}>
                  <SelectTrigger className="text-right rounded-2xl">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">فيسبوك</SelectItem>
                    <SelectItem value="instagram">إنستجرام</SelectItem>
                    <SelectItem value="twitter">تويتر</SelectItem>
                    <SelectItem value="friend">صديق</SelectItem>
                    <SelectItem value="other">آخر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userType" className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  نوع الحساب
                </Label>
                <Select value={userType} onValueChange={(value: "user" | "doctor") => setUserType(value)}>
                  <SelectTrigger className="text-right rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">مستخدم عادي 🧍</SelectItem>
                    <SelectItem value="doctor">دكتور 🧑‍⚕️</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>


            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary-light hover:shadow-glow transition-all rounded-2xl h-14 text-lg font-bold hover-scale" 
              disabled={loading}
            >
              {loading ? (
                <span className="inline-block w-6 h-6 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
              ) : (
                isLogin ? t('auth.login') : t('auth.signup')
              )}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full text-primary hover:text-primary/80 font-semibold"
              onClick={() => {
                setIsLogin(!isLogin);
                if (isLogin) {
                  setTimeout(() => setShowExtraFields(true), 100);
                } else {
                  setShowExtraFields(false);
                }
              }}
            >
              {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
            </Button>
          </form>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
