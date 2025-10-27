import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Users, DollarSign, TrendingUp, Shield, ShieldOff, Search, Eye } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import verifiedBadge from "@/assets/verified-badge.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const AdminDashboard = () => {
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorRequests, setDoctorRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalBalance: 0, totalCommissions: 0 });
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = useState("");
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية الوصول لهذه الصفحة",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    loadData();
  };

  const loadData = async () => {
    const { data: deposits } = await supabase
      .from("deposit_requests")
      .select("*, profiles(full_name, avatar_url, phone)")
      .order("created_at", { ascending: false });

    const { data: withdraws } = await supabase
      .from("withdraw_requests")
      .select("*, doctors(doctor_name, user_id, phone_number, image_url)")
      .order("created_at", { ascending: false });

    const { data: usersData } = await supabase
      .from("profiles")
      .select("*, wallets(balance)")
      .order("created_at", { ascending: false });

    const { data: doctorsData } = await supabase
      .from("doctors")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: doctorReqs } = await supabase
      .from("doctor_requests")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: wallets } = await supabase.from("wallets").select("balance");
    const totalBalance = wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
    
    // Commission stats based on approved withdraw requests' commission field
    const { data: approvedWithdraws } = await supabase
      .from("withdraw_requests")
      .select("commission, status")
      .eq('status', 'approved');
    const totalCommissions = approvedWithdraws?.reduce((sum, r) => sum + Number(r.commission || 0), 0) || 0;

    setDepositRequests(deposits || []);
    setWithdrawRequests(withdraws || []);
    setUsers(usersData || []);
    setDoctors(doctorsData || []);
    setDoctorRequests(doctorReqs || []);
    setStats({
      totalUsers: usersData?.length || 0,
      totalBalance,
      totalCommissions,
    });
  };

  const handleDepositApprove = async (requestId: string, amount: number, userId: string) => {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (wallet) {
      const newBalance = Number(wallet.balance) + amount;
      
      await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", userId);
    }

    await supabase
      .from("deposit_requests")
      .update({ 
        status: "approved",
        admin_notes: adminNotes[requestId] || ""
      })
      .eq("id", requestId);

    // Send email
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (prof?.email) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: 'deposit_approved', to: prof.email, data: { name: prof.full_name, amount, notes: adminNotes[requestId] || '' } })
      }).catch(() => {});
    }

    toast({ title: "تمت الموافقة!", description: "تم إضافة الرصيد للمستخدم" });

    loadData();
  };

  const handleDepositReject = async (requestId: string) => {
    await supabase
      .from("deposit_requests")
      .update({ 
        status: "rejected",
        admin_notes: adminNotes[requestId] || ""
      })
      .eq("id", requestId);

    // Email user
    const dep = depositRequests.find(r => r.id === requestId);
    if (dep) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', dep.user_id).single();
      if (prof?.email) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ type: 'deposit_rejected', to: prof.email, data: { name: prof.full_name, amount: dep.amount, notes: adminNotes[requestId] || '' } })
        }).catch(() => {});
      }
    }

    toast({ title: "تم الرفض", description: "تم رفض الطلب" });

    loadData();
  };

  const handleWithdrawApprove = async (requestId: string, totalAmount: number, doctorUserId: string) => {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", doctorUserId)
      .single();

    if (wallet) {
      const newBalance = Number(wallet.balance) - totalAmount; // خصم المبلغ الإجمالي
      
      await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", doctorUserId);
    }

    await supabase
      .from("withdraw_requests")
      .update({ 
        status: "approved",
        admin_notes: adminNotes[requestId] || ""
      })
      .eq("id", requestId);

    // Email doctor
    const req = withdrawRequests.find(r => r.id === requestId);
    if (req) {
      const { data: doctorProfile } = await supabase.from('profiles').select('*').eq('id', req.doctors?.user_id || doctorUserId).single();
      if (doctorProfile?.email) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ type: 'withdraw_approved', to: doctorProfile.email, data: { name: req.doctors?.doctor_name || '', amount: req.net_amount, notes: adminNotes[requestId] || '' } })
        }).catch(() => {});
      }
    }

    toast({ title: "تمت الموافقة!", description: "تم خصم المبلغ الإجمالي من رصيد الطبيب" });

    loadData();
  };

  const handleWithdrawReject = async (requestId: string) => {
    await supabase
      .from("withdraw_requests")
      .update({ 
        status: "rejected",
        admin_notes: adminNotes[requestId] || ""
      })
      .eq("id", requestId);

    // Email doctor
    const req = withdrawRequests.find(r => r.id === requestId);
    if (req) {
      const { data: doctorProfile } = await supabase.from('profiles').select('*').eq('id', req.doctors?.user_id).single();
      if (doctorProfile?.email) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ type: 'withdraw_rejected', to: doctorProfile.email, data: { name: req.doctors?.doctor_name || '', amount: req.net_amount, notes: adminNotes[requestId] || '' } })
        }).catch(() => {});
      }
    }

    toast({ title: "تم الرفض", description: "تم رفض طلب السحب" });

    loadData();
  };

  const toggleVerification = async (doctorId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("doctors")
      .update({ 
        is_verified: !currentStatus,
        verification_requested_at: !currentStatus ? new Date().toISOString() : null
      })
      .eq("id", doctorId);

    if (error) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: !currentStatus ? "تم التوثيق!" : "تم إلغاء التوثيق",
      description: !currentStatus ? "تم توثيق الطبيب بنجاح" : "تم إلغاء توثيق الطبيب",
    });

    loadData();
  };

  const approveDoctorRequest = async (req: any) => {
    // Mark request approved and create doctor profile if not exists
    const { error: updErr } = await supabase
      .from('doctor_requests')
      .update({ status: 'approved' })
      .eq('id', req.id);
    if (updErr) {
      toast({ title: 'خطأ', description: updErr.message, variant: 'destructive' });
      return;
    }

    // Ensure a doctors row exists; if exists, just set is_verified true
    const { data: existing } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', req.user_id)
      .maybeSingle();

    if (!existing) {
      // Create minimal doctor row; details can be edited later
      const { error: insErr } = await supabase
        .from('doctors')
        .insert([{
          user_id: req.user_id,
          department_id: (await supabase.from('medical_departments').select('id').limit(1).maybeSingle()).data?.id || null,
          specialization_ar: req.specialization,
          specialization_en: req.specialization,
          price: 100,
          whatsapp_number: req.phone,
          doctor_name: req.full_name,
          phone_number: req.phone,
          is_active: false,
          is_verified: true,
        }]);
      if (insErr) {
        toast({ title: 'تم تحديث الطلب لكن لم يتم إنشاء ملف الطبيب', description: insErr.message });
      }
    } else {
      await supabase.from('doctors').update({ is_verified: true }).eq('id', existing.id);
    }

    // Send email (doctor request approved)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', req.user_id).single();
    if (prof?.email) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          type: 'doctor_request_approved',
          to: prof.email,
          data: { name: req.full_name }
        })
      }).catch(() => {});
    }

    toast({ title: 'تم القبول', description: 'تم قبول طلب الطبيب' });
    loadData();
  };

  const rejectDoctorRequest = async (req: any) => {
    const { error } = await supabase
      .from('doctor_requests')
      .update({ status: 'rejected', admin_notes: adminNotes[req.id] || '' })
      .eq('id', req.id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }

    const { data: prof2 } = await supabase.from('profiles').select('*').eq('id', req.user_id).single();
    if (prof2?.email) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          type: 'doctor_request_rejected',
          to: prof2.email,
          data: { name: req.full_name, amount: '', notes: adminNotes[req.id] || '' }
        })
      }).catch(() => {});
    }

    toast({ title: 'تم الرفض', description: 'تم رفض طلب الطبيب' });
    loadData();
  };

  const handleSearch = async () => {
    if (!searchId) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رقم العملية",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*, profiles(full_name, avatar_url, phone), doctors(*, medical_departments(*))")
      .eq("id", searchId.toUpperCase())
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "غير موجود",
        description: "لم يتم العثور على العملية",
        variant: "destructive",
      });
      setSearchResult(null);
    } else {
      setSearchResult(data);
      toast({
        title: "تم العثور!",
        description: "تم العثور على العملية بنجاح",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            العودة
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-strong">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">لوحة تحكم المشرف</h1>
            <p className="text-sm text-muted-foreground">إدارة المنصة</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="shadow-medium rounded-3xl border-0">
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">مستخدم</p>
            </CardContent>
          </Card>
          <Card className="shadow-medium rounded-3xl border-0">
            <CardContent className="pt-6 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-lg font-bold">{stats.totalBalance.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">رصيد</p>
            </CardContent>
          </Card>
          <Card className="shadow-medium rounded-3xl border-0">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-lg font-bold">{stats.totalCommissions.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">عمولة</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Box */}
        <Card className="mb-6 shadow-medium rounded-3xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              البحث عن عملية
            </CardTitle>
            <CardDescription>ابحث عن عملية باستخدام رقم العملية (ID)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="أدخل رقم العملية... (مثال: ABC1234)"
                className="text-right rounded-full"
              />
              <Button onClick={handleSearch} className="rounded-full">
                <Search className="w-4 h-4 ml-2" />
                بحث
              </Button>
            </div>
            {searchResult && (
              <div className="p-5 bg-gradient-to-r from-primary/10 to-primary-light/10 rounded-2xl space-y-3 animate-fade-in border border-primary/20">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-primary">
                    <AvatarImage src={searchResult.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white text-xl">
                      {searchResult.profiles?.full_name?.charAt(0) || 'م'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{searchResult.profiles?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">📱 {searchResult.profiles?.phone || 'غير محدد'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-background p-3 rounded-lg">
                    <p className="text-muted-foreground">رقم العملية</p>
                    <p className="font-bold text-primary">{searchResult.id}</p>
                  </div>
                  <div className="bg-background p-3 rounded-lg">
                    <p className="text-muted-foreground">المبلغ</p>
                    <p className="font-bold text-primary">{searchResult.amount} جنيه</p>
                  </div>
                  <div className="bg-background p-3 rounded-lg">
                    <p className="text-muted-foreground">التاريخ</p>
                    <p className="font-bold">{new Date(searchResult.created_at).toLocaleString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div className="bg-background p-3 rounded-lg">
                    <p className="text-muted-foreground">النوع</p>
                    <p className="font-bold">{searchResult.type === 'consultation' ? 'استشارة' : searchResult.type}</p>
                  </div>
                </div>
                {searchResult.doctors && (
                  <div className="bg-background p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarImage src={searchResult.doctors?.image_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white">
                          {searchResult.doctors?.doctor_name?.charAt(0) || 'د'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{searchResult.doctors?.doctor_name}</p>
                        <p className="text-xs text-muted-foreground">{searchResult.doctors?.medical_departments?.name_ar}</p>
                      </div>
                    </div>
                  </div>
                )}
                {searchResult.description && (
                  <div className="bg-background p-3 rounded-lg">
                    <p className="text-muted-foreground text-sm">الوصف</p>
                    <p className="font-medium">{searchResult.description}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="deposits" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="deposits">الإيداع</TabsTrigger>
            <TabsTrigger value="withdrawals">السحب</TabsTrigger>
            <TabsTrigger value="doctor-requests">طلبات الأطباء</TabsTrigger>
            <TabsTrigger value="active-doctors">الطلبات النشطة</TabsTrigger>
            <TabsTrigger value="doctors">الأطباء</TabsTrigger>
            <TabsTrigger value="users">المستخدمين</TabsTrigger>
          </TabsList>
          <TabsContent value="doctor-requests" className="space-y-4">
            {doctorRequests.map((req) => (
              <Card key={req.id} className="rounded-3xl border-0 shadow-medium">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{req.full_name}</span>
                    <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {req.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {req.phone} • {req.specialization}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[req.certificate_url, req.id_card_front_url, req.id_card_back_url].map((path: string, idx: number) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="rounded-xl"
                        size="sm"
                        onClick={async () => {
                          const { data, error } = await supabase.storage
                            .from('doctor-documents')
                            .createSignedUrl(path, 60 * 60);
                          if (!error && data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          }
                        }}
                      >
                        <Eye className="w-4 h-4 ml-2" />
                        عرض المستند {idx + 1}
                      </Button>
                    ))}
                  </div>
                  {req.status === 'approved' && (
                    <div className="grid grid-cols-3 gap-3">
                      {[req.certificate_url, req.id_card_front_url, req.id_card_back_url].map((path: string, idx: number) => (
                        <Button
                          key={`del-${idx}`}
                          variant="destructive"
                          className="rounded-xl"
                          size="sm"
                          onClick={async () => {
                            // Delete the file to save storage space
                            await supabase.storage.from('doctor-documents').remove([path]);
                            toast({ title: 'تم الحذف', description: `تم حذف المستند ${idx + 1}` });
                          }}
                        >
                          حذف المستند {idx + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                  {req.status === 'pending' && (
                    <>
                      <Textarea
                        placeholder="ملاحظات..."
                        value={adminNotes[req.id] || ''}
                        onChange={(e) => setAdminNotes({ ...adminNotes, [req.id]: e.target.value })}
                        className="rounded-2xl text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => approveDoctorRequest(req)} className="flex-1 bg-green-600 hover:bg-green-700 rounded-full" size="sm">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          قبول وتوثيق
                        </Button>
                        <Button onClick={() => rejectDoctorRequest(req)} variant="destructive" className="flex-1 rounded-full" size="sm">
                          <XCircle className="w-4 h-4 mr-2" />
                          رفض
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
            {doctorRequests.length === 0 && (
              <p className="text-center text-muted-foreground py-8">لا توجد طلبات حالياً</p>
            )}
          </TabsContent>

          <TabsContent value="deposits" className="space-y-4">
            {depositRequests.map((req) => (
              <Card key={req.id} className="rounded-3xl border-0 shadow-medium">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <Avatar className="w-14 h-14 border-2 border-primary/20">
                      <AvatarImage src={req.profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white">
                        {req.profiles?.full_name?.charAt(0) || 'م'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{req.profiles?.full_name}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span>{req.payment_method}</span>
                            {req.profiles?.phone && (
                              <span className="text-xs">• {req.profiles?.phone}</span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {req.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-primary">{req.amount} جنيه</div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full rounded-full" 
                        size="sm"
                        onClick={async () => {
                          const path: string = req.proof_image_url || '';
                          if (path.startsWith('http')) {
                            setSelectedImage(path);
                            return;
                          }
                          const { data, error } = await supabase.storage
                            .from('deposit-proofs')
                            .createSignedUrl(path, 60 * 60);
                          if (!error && data?.signedUrl) {
                            setSelectedImage(data.signedUrl);
                          }
                        }}
                      >
                        عرض إثبات الدفع
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>إثبات الدفع</DialogTitle>
                      </DialogHeader>
                      {selectedImage && (
                        <img src={selectedImage} alt="Proof" className="w-full rounded-lg" />
                      )}
                    </DialogContent>
                  </Dialog>

                  {req.status === 'pending' && (
                    <>
                      <Textarea
                        placeholder="ملاحظات..."
                        value={adminNotes[req.id] || ""}
                        onChange={(e) => setAdminNotes({...adminNotes, [req.id]: e.target.value})}
                        className="rounded-2xl text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDepositApprove(req.id, req.amount, req.user_id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 rounded-full"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          موافقة
                        </Button>
                        <Button
                          onClick={() => handleDepositReject(req.id)}
                          variant="destructive"
                          className="flex-1 rounded-full"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          رفض
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            {withdrawRequests.map((req) => (
              <Card key={req.id} className="rounded-3xl border-0 shadow-medium">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <Avatar className="w-14 h-14 border-2 border-primary/20">
                      <AvatarImage src={req.doctors?.image_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white">
                        {req.doctors?.doctor_name?.charAt(0) || 'د'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{req.doctors?.doctor_name}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span>طلب سحب</span>
                            {req.doctors?.phone_number && (
                              <span className="text-xs">• {req.doctors?.phone_number}</span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {req.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">المبلغ الإجمالي: {req.amount} جنيه</div>
                    <div className="text-sm text-muted-foreground">العمولة (10%): {req.commission} جنيه</div>
                    <div className="text-2xl font-bold text-primary">الصافي: {req.net_amount} جنيه</div>
                  </div>

                  {req.status === 'pending' && (
                    <>
                      <Textarea
                        placeholder="ملاحظات..."
                        value={adminNotes[req.id] || ""}
                        onChange={(e) => setAdminNotes({...adminNotes, [req.id]: e.target.value})}
                        className="rounded-2xl text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleWithdrawApprove(req.id, req.amount, req.doctors.user_id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 rounded-full"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          موافقة
                        </Button>
                        <Button
                          onClick={() => handleWithdrawReject(req.id)}
                          variant="destructive"
                          className="flex-1 rounded-full"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          رفض
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="active-doctors" className="space-y-4">
            <Card className="rounded-3xl border-0 shadow-medium">
              <CardHeader>
                <CardTitle>الطلبات النشطة للأطباء</CardTitle>
                <CardDescription>الأطباء الذين لديهم طلبات نشطة حالياً</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctors.filter(d => d.is_active).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">لا توجد طلبات نشطة حالياً</p>
                )}
                {doctors.filter(d => d.is_active).map((doctor) => (
                  <div key={doctor.id} className="flex items-center gap-4 p-4 bg-secondary rounded-2xl">
                    <Avatar className="w-16 h-16 border-2 border-primary/20">
                      <AvatarImage src={doctor.image_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white">
                        {doctor.doctor_name?.charAt(0) || 'د'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{doctor.doctor_name || 'غير محدد'}</h3>
                        {doctor.is_verified && (
                          <img src={verifiedBadge} alt="موثق" className="w-5 h-5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{doctor.specialization_ar}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        رقم التليفون: {doctor.phone_number || 'غير محدد'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        السعر: {doctor.consultation_fee || 0} جنيه • العنوان: {doctor.address || 'غير محدد'}
                      </p>
                    </div>
                    <Badge variant="default">نشط</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="doctors" className="space-y-4">
            {doctors.map((doctor) => (
              <Card key={doctor.id} className="rounded-3xl border-0 shadow-medium">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="w-16 h-16 border-2 border-primary/20">
                        <AvatarImage src={doctor.image_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white">
                          {doctor.doctor_name?.charAt(0) || 'د'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{doctor.doctor_name || 'غير محدد'}</h3>
                          {doctor.is_verified && (
                            <img src={verifiedBadge} alt="موثق" className="w-5 h-5" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{doctor.specialization_ar}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          السعر: {doctor.consultation_fee || 0} جنيه
                        </p>
                        <Badge variant={doctor.is_active ? "default" : "secondary"} className="mt-2">
                          {doctor.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => toggleVerification(doctor.id, doctor.is_verified)}
                      variant={doctor.is_verified ? "destructive" : "default"}
                      size="sm"
                      className="rounded-full gap-2"
                    >
                      {doctor.is_verified ? (
                        <>
                          <ShieldOff className="w-4 h-4" />
                          إلغاء
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          توثيق
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {users.map((user) => (
              <Card key={user.id} className="shadow-medium rounded-3xl border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{user.full_name}</CardTitle>
                      <CardDescription className="text-xs">{user.phone}</CardDescription>
                    </div>
                    <Badge variant={user.user_type === 'doctor' ? 'default' : 'secondary'}>
                      {user.user_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الرصيد:</span>
                    <span className="font-bold text-primary">{user.wallets?.balance || 0} ج</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default AdminDashboard;
