import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Copy, Check, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import verifiedBadge from "@/assets/verified-badge.png";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (profileData?.user_type === 'doctor') {
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      setDoctor(doctorData);
    }

    setProfile(profileData);
    setWallet(walletData);
    setFullName(profileData?.full_name || "");
    setPhone(profileData?.phone || "");
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن يكون أقل من 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      toast({
        title: "تم!",
        description: "تم تحديث الصورة الشخصية",
      });

      loadProfile();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq("id", user.id);

      toast({
        title: "تم التحديث!",
        description: "تم تحديث البيانات بنجاح",
      });

      loadProfile();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user?.id || "");
    setCopiedId(true);
    toast({
      title: "تم النسخ!",
      description: "تم نسخ معرف المستخدم",
    });
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-32">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            العودة
          </Button>
        </div>

        {/* Profile Header */}
        <Card className="mb-6 shadow-strong animate-fade-in rounded-3xl border-0 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary to-primary-light" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col items-center -mt-16">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-background shadow-strong">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary-light text-white">
                    {profile?.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-all shadow-medium"
                >
                  <Upload className="w-5 h-5" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold mt-4">{profile?.full_name}</h2>
                {doctor?.is_verified && (
                  <img src={verifiedBadge} alt="موثق" className="w-7 h-7 mt-4" />
                )}
              </div>
              <Badge className="mt-2" variant={profile?.user_type === 'doctor' ? 'default' : 'secondary'}>
                {profile?.user_type === 'doctor' ? '👨‍⚕️ دكتور' : '👤 مستخدم'}
              </Badge>

              <div className="flex items-center gap-2 mt-4 bg-secondary px-4 py-2 rounded-full">
                <span className="text-sm text-muted-foreground">معرف المستخدم:</span>
                <code className="text-xs font-mono">{user?.id?.substring(0, 8)}...</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyUserId}
                  className="h-6 w-6 p-0 rounded-full"
                >
                  {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Info */}
        {profile?.user_type !== 'doctor' && (
          <Card className="mb-6 shadow-medium animate-slide-in-right rounded-3xl border-0">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary-light/10 rounded-t-3xl">
              <CardTitle className="text-lg">الرصيد الحالي</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {wallet?.balance?.toFixed(0) || "0"} <span className="text-xl">نقطة</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* زر الدخول كمتطوع */}
        <Card className="mb-6 shadow-medium animate-fade-in rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-t-3xl">
            <CardTitle className="text-lg flex items-center gap-2">🤝 الدخول كمتطوع</CardTitle>
            <CardDescription>ساعد المرضى أو الأطباء بدون مقابل.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <Button
              onClick={() => navigate("/volunteer")}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full h-11 text-white"
            >
              الدخول كمتطوع
            </Button>
          </CardContent>
        </Card>

        {/* زر محلل التحايل بالذكاء الاصطناعي */}
        <Card className="mb-6 shadow-medium animate-fade-in rounded-3xl border-0">
          <CardHeader>
            <CardTitle className="text-lg text-center">🧠 جرب الآن محلل التحايل بالذكاء الاصطناعي</CardTitle>
            <CardDescription className="text-center">حلل البيانات واكتشف الأنماط الذكية</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-center">
            <Button
              onClick={() => navigate("/analyze")}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full h-11 text-white"
            >
              جرب الآن
            </Button>
          </CardContent>
        </Card>

        {/* زر تجربة البرنامج */}
        <Card className="mb-6 shadow-medium animate-fade-in rounded-3xl border-0">
          <CardHeader>
            <CardTitle className="text-lg text-center">جرّب برنامج التواصل الطبي</CardTitle>
            <CardDescription className="text-center">اضغط لتجربة البرنامج مباشرة</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-center">
            <Button
              onClick={() => window.open("https://zentry-social.vercel.app", "_blank")}
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full h-11 text-white"
            >
              دخول البرنامج
            </Button>
          </CardContent>
        </Card>

        {/* دعم فني */}
        <Card className="mb-6 shadow-medium animate-fade-in rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-rose-500/10 to-rose-600/10 rounded-t-3xl text-center">
            <CardTitle className="text-lg flex justify-center items-center gap-2">
              💬 الدعم الفني
            </CardTitle>
            <CardDescription>تواصل معنا لأي استفسار أو مساعدة</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <Button
              onClick={() => window.open("mailto:admin@egyptianai.app")}
              className="w-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full h-11 text-white flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              تواصل عبر البريد الإلكتروني
            </Button>
          </CardContent>
        </Card>

        {/* تعديل البيانات */}
        <Card className="shadow-medium animate-fade-in rounded-3xl border-0 mb-10">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary-light/10 rounded-t-3xl">
            <CardTitle className="text-lg">تعديل البيانات</CardTitle>
            <CardDescription>قم بتحديث معلوماتك الشخصية</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="text-right rounded-2xl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="text-right rounded-2xl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" value={user?.email || ""} disabled className="text-right rounded-2xl bg-secondary" />
              <p className="text-xs text-muted-foreground">لا يمكن تعديل البريد الإلكتروني</p>
            </div>

            <Button onClick={handleUpdateProfile} className="w-full bg-gradient-to-r from-primary to-primary-light rounded-full h-11">
              حفظ التغييرات
            </Button>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;