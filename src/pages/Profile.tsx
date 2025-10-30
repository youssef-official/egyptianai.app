import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Mail, Phone, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

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

    setProfile(profileData);
    setFullName(profileData?.full_name || "");
    setPhone(profileData?.phone || "");
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ios-light-gray">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ios-light-gray pb-32">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">Profile</h1>
          <div className="w-10"></div> {/* Spacer */}
        </header>

        {/* Profile Info */}
        <div className="flex flex-col items-center mb-8">
          <Avatar className="w-24 h-24 mb-4 border-4 border-white shadow-md">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-3xl bg-primary text-white">
              {profile?.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold text-gray-800">{profile?.full_name}</h2>
          <p className="text-gray-500">{user?.email}</p>
        </div>

        {/* Edit Profile Section */}
        <Card className="p-4 bg-white rounded-2xl shadow-md mb-6">
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-gray-600">Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-12" />
              </div>
            </div>
            <div>
              <Label htmlFor="phone" className="text-gray-600">Phone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-12" />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-600">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input id="email" value={user?.email || ""} disabled className="pl-10 h-12 bg-gray-100" />
              </div>
            </div>
            <Button className="w-full h-12">Update Profile</Button>
          </CardContent>
        </Card>

        {/* Other Options */}
        <Card className="p-2 bg-white rounded-2xl shadow-md">
            <ul className="divide-y divide-gray-100">
                <li className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <span className="font-semibold text-gray-700">Settings</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </li>
                <li className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <span className="font-semibold text-gray-700">Support</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </li>
                <li className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <span className="font-semibold text-red-500">Log Out</span>
                </li>
            </ul>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
