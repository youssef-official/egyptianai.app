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
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
  const { t } = useTranslation();

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
            title: t("auth.welcome"),
            description: t("auth.loginSuccess"),
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
          title: t("auth.accountCreated"),
          description: t("auth.canLoginNow"),
        });

        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: t("auth.error"),
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
        title: t("auth.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative circles similar to the design */}
      <div className="absolute top-20 left-10 w-48 h-48 bg-gradient-to-br from-purple-300 to-purple-200 rounded-full opacity-60 blur-xl"></div>
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-gradient-to-br from-pink-300 to-red-300 rounded-full opacity-60 blur-xl"></div>
      <div className="absolute top-40 right-20 w-32 h-32 bg-gradient-to-br from-gray-300 to-gray-200 rounded-full opacity-40 blur-lg"></div>
      
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl animate-fade-in rounded-3xl border-0 bg-white/95 backdrop-blur-sm relative z-10">
        <CardHeader className="space-y-4 text-center pb-6 pt-8">
          <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center shadow-lg">
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">SPEEDSPRINT</p>
            <CardTitle className="text-4xl font-bold text-gray-900 mb-2">
              {t("app.tagline")}
            </CardTitle>
            <p className="text-5xl font-bold text-gray-900">{t("app.name")}</p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && showExtraFields && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2 text-sm font-medium">
                    <User className="w-4 h-4" />
                    {t("auth.fullName")}
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="rounded-xl border-gray-200 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="w-4 h-4" />
                    {t("auth.phone")}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required={!isLogin}
                    className="rounded-xl border-gray-200 h-12"
                    placeholder="01XXXXXXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referral" className="flex items-center gap-2 text-sm font-medium">
                    <Info className="w-4 h-4" />
                    {t("auth.referralSource")}
                  </Label>
                  <Select value={referralSource} onValueChange={setReferralSource}>
                    <SelectTrigger className="rounded-xl border-gray-200 h-12">
                      <SelectValue placeholder={t("auth.referralSource")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userType" className="flex items-center gap-2 text-sm font-medium">
                    <Stethoscope className="w-4 h-4" />
                    {t("auth.userType")}
                  </Label>
                  <Select value={userType} onValueChange={(value: "user" | "doctor") => setUserType(value)}>
                    <SelectTrigger className="rounded-xl border-gray-200 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t("auth.normalUser")}</SelectItem>
                      <SelectItem value="doctor">{t("auth.doctor")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="w-4 h-4" />
                {t("auth.email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl border-gray-200 h-12"
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                <Lock className="w-4 h-4" />
                {t("auth.password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-xl border-gray-200 h-12"
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white rounded-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all mt-6" 
              disabled={loading}
            >
              {loading ? (
                <span className="inline-block w-5 h-5 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
              ) : (
                isLogin ? t("auth.login") : t("auth.signup")
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full h-14 border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              onClick={() => {
                setIsLogin(!isLogin);
                if (isLogin) {
                  setTimeout(() => setShowExtraFields(true), 100);
                } else {
                  setShowExtraFields(false);
                }
              }}
            >
              {isLogin ? t("auth.signup") : t("auth.login")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
