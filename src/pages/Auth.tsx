import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Mail, Lock, User, Phone, Info } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showExtraFields, setShowExtraFields] = useState(false);
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
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_type")
            .eq("id", data.user.id)
            .single();

          toast({
            title: "مرحباً بك!",
            description: "تم تسجيل الدخول بنجاح",
          });

          if (profile?.user_type === "doctor") {
            navigate("/doctor-dashboard");
          } else {
            navigate("/");
          }
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

        toast({
          title: "تم إنشاء الحساب!",
          description: "يمكنك الآن تسجيل الدخول",
        });

        setIsLogin(true);
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

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-light to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-strong animate-scale-in rounded-3xl border-0 hover-lift">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-glow animate-pulse-glow">
            <Stethoscope className="w-14 h-14 text-white" />
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
            Cura Verse
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {isLogin ? "سجل دخولك للمتابعة" : "أنشئ حساباً جديداً"}
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
                placeholder="example@email.com"
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
                isLogin ? "تسجيل الدخول" : "إنشاء حساب"
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">أو</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl h-14 border-2 font-semibold hover-lift"
              onClick={handleGoogleAuth}
            >
              <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLogin ? "الدخول" : "التسجيل"} بواسطة Google
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
              {isLogin ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجل دخولك"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
