import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import verifiedBadge from "@/assets/verified.png";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
    setProfile(profileData);
    const { data: walletData } = await supabase.from("wallets").select("*").eq("user_id", user?.id).single();
    setWallet(walletData);
  }

  async function handleAvatarUpload(e: any) {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const filePath = `avatars/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("avatars").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
      setProfile({ ...profile, avatar_url: data.publicUrl });
    } finally {
      setUploading(false);
    }
  }

  function copyUserId() {
    navigator.clipboard.writeText(user?.id || "");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Profile Header Card */}
      <Card className="shadow-strong animate-fade-in rounded-3xl border-0 overflow-hidden">
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
              {profile?.is_verified && (
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

      {/* Wallet Info بعد البروفايل مباشرة */}
      {profile?.user_type !== 'doctor' && (
        <Card className="shadow-medium animate-slide-in-right rounded-3xl border-0">
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

      {/* Buttons Section */}
      <div className="space-y-4">
        <Button onClick={() => navigate("/volunteer")} className="w-full py-6 text-lg rounded-2xl bg-green-600 hover:bg-green-700">
          الدخول كمتطوع
        </Button>

        <Button onClick={() => navigate("/verify")} className="w-full py-6 text-lg rounded-2xl bg-amber-500 hover:bg-amber-600">
          توثيق الحساب
        </Button>

        <Button onClick={() => navigate("/analyze")} className="w-full py-6 text-lg rounded-2xl bg-sky-600 hover:bg-sky-700">
          جرّب محلل التحاليل والروشتات بالذكاء الاصطناعي
        </Button>

        <Button onClick={() => window.open("https://ymoo.site", "_blank")} className="w-full py-6 text-lg rounded-2xl bg-blue-600 hover:bg-blue-700">
          جرّب برنامج التواصل الطبي
        </Button>

        <Button onClick={() => navigate("/edit-profile")} className="w-full py-6 text-lg rounded-2xl bg-primary hover:bg-primary/90">
          تعديل البيانات
        </Button>

        <Button onClick={() => navigate("/support")} className="w-full py-6 text-lg rounded-2xl bg-gray-700 hover:bg-gray-800">
          الدعم الفني
        </Button>
      </div>
    </div>
  );
}