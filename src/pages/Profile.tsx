import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Copy, Check, MessageCircle, Stethoscope, HeadphonesIcon, FlaskConical, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import verifiedBadge from "@/assets/verified-badge.png";
import { uploadToR2, getR2SignedUrl } from "@/lib/r2-storage";

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
  const [avatarUrl, setAvatarUrl] = useState<string>("");
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

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    const { data: walletData } = await supabase.from("wallets").select("*").eq("user_id", session.user.id).single();

    if (profileData?.user_type === "doctor") {
      const { data: doctorData } = await supabase.from("doctors").select("*").eq("user_id", session.user.id).single();
      setDoctor(doctorData);
    }

    setProfile(profileData);
    setWallet(walletData);
    setFullName(profileData?.full_name || "");
    setPhone(profileData?.phone || "");
    
    // Load avatar URL - if it's an R2 path, get signed URL, otherwise use as-is
    if (profileData?.avatar_url) {
      if (profileData.avatar_url.startsWith('http') || profileData.avatar_url.startsWith('/')) {
        setAvatarUrl(profileData.avatar_url);
      } else {
        // It's an R2 path, get signed URL
        try {
          const signedUrl = await getR2SignedUrl(profileData.avatar_url, 3600);
          setAvatarUrl(signedUrl);
        } catch (error) {
          console.error('Error loading avatar:', error);
          setAvatarUrl('');
        }
      }
    } else {
      setAvatarUrl('');
    }
    
    setLoading(false);
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user?.id || "");
    setCopiedId(true);
    toast({ title: "تم النسخ!", description: "تم نسخ معرف المستخدم" });
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "خطأ", description: "الرجاء اختيار صورة صحيحة", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: "خطأ", description: "حجم الصورة كبير جداً (الحد الأقصى 5MB)", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('المستخدم غير مسجل الدخول');

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const path = `profile-images/${currentUser.id}/${fileName}`;

      // Delete old avatar if exists
      if (profile?.avatar_url && !profile.avatar_url.startsWith('http') && !profile.avatar_url.startsWith('/')) {
        try {
          const { deleteFromR2 } = await import('@/lib/r2-storage');
          await deleteFromR2(profile.avatar_url);
        } catch (error) {
          console.error('Error deleting old avatar:', error);
        }
      }

      // Upload new avatar
      await uploadToR2(file, path);

      // Update database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // Get signed URL for immediate display
      const signedUrl = await getR2SignedUrl(path, 3600);
      setAvatarUrl(signedUrl);
      
      // Reload profile
      await loadProfile();

      toast({ title: "تم بنجاح!", description: "تم تحديث صورة البروفايل" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل في رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> العودة
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="mb-6 shadow-strong rounded-3xl border-0 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary to-primary-light" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col items-center -mt-16">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-background shadow-strong">
                  <AvatarImage src={avatarUrl || profile?.avatar_url} />
                  <AvatarFallback>{profile?.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-white" />
                  )}
                </label>
              </div>
              {uploading && (
                <p className="text-sm text-muted-foreground mt-2">جاري رفع الصورة...</p>
              )}

              <h2 className="text-2xl font-bold mt-4">{profile?.full_name}</h2>
              <Badge className="mt-2" variant={profile?.user_type === "doctor" ? "default" : "secondary"}>
                {profile?.user_type === "doctor" ? "👨‍⚕️ دكتور" : "👤 مستخدم"}
              </Badge>

              <div className="flex items-center gap-2 mt-4 bg-secondary px-4 py-2 rounded-full">
                <span className="text-sm text-muted-foreground">معرف المستخدم:</span>
                <code className="text-xs font-mono">{user?.id?.substring(0, 8)}...</code>
                <Button variant="ghost" size="sm" onClick={copyUserId} className="h-6 w-6 p-0 rounded-full">
                  {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet moved up */}
        <Card className="mb-6 shadow-medium rounded-3xl border-0">
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

        {/* Social Media Medical Site Button */}
        <Card className="mb-6 shadow-medium rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 rounded-t-3xl">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-600" />
              يمكنك الآن تجربة برنامج التواصل الاجتماعي الطبي
            </CardTitle>
            <CardDescription>تفاعل مع الأطباء والمستخدمين في منصة واحدة.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <Button onClick={() => navigate("/social")} className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full h-11 text-white">
              فتح البرنامج الاجتماعي
            </Button>
          </CardContent>
        </Card>

        {/* Volunteer Section */}
        <Card className="mb-6 shadow-medium rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-t-3xl">
            <CardTitle className="text-lg flex items-center gap-2">🤝 الدخول كمتطوع</CardTitle>
            <CardDescription>ساهم في مساعدة المرضى والمجتمع.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <Button onClick={() => navigate("/volunteer")} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full h-11 text-white">
              الدخول كمتطوع
            </Button>
          </CardContent>
        </Card>

        {/* AI Analyzer */}
        <Card className="mb-6 shadow-medium rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-t-3xl">
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-blue-600" /> محلل التحاليل بالذكاء الاصطناعي
            </CardTitle>
            <CardDescription>حلل نتائجك الطبية بدقة عالية.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <Button onClick={() => navigate("/anlize")} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-11">
              فتح المحلل الذكي
            </Button>
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="shadow-medium rounded-3xl border-0">
          <CardHeader className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-t-3xl">
            <CardTitle className="text-lg flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5 text-green-600" /> الدعم والمساعدة
            </CardTitle>
            <CardDescription>تواصل معنا لأي استفسار</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <a href="mailto:admin@egyptianai.app" className="flex items-center justify-center gap-2 p-3 bg-secondary hover:bg-secondary/80 rounded-full">
              <MessageCircle className="w-4 h-4" /> admin@egyptianai.app
            </a>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;