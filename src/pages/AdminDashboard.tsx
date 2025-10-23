import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Users, DollarSign, TrendingUp, Shield, ShieldOff } from "lucide-react";
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
  const [stats, setStats] = useState({ totalUsers: 0, totalBalance: 0, totalCommissions: 0 });
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = useState("");
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

    const { data: wallets } = await supabase.from("wallets").select("balance");
    const totalBalance = wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
    
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("type", "consultation");
    const totalCommissions = (transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0) * 0.1;

    setDepositRequests(deposits || []);
    setWithdrawRequests(withdraws || []);
    setUsers(usersData || []);
    setDoctors(doctorsData || []);
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

    toast({
      title: "تمت الموافقة!",
      description: "تم إضافة الرصيد للمستخدم",
    });

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

    toast({
      title: "تم الرفض",
      description: "تم رفض الطلب",
    });

    loadData();
  };

  const handleWithdrawApprove = async (requestId: string, netAmount: number, doctorUserId: string) => {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", doctorUserId)
      .single();

    if (wallet) {
      const newBalance = Number(wallet.balance) - netAmount;
      
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

    toast({
      title: "تمت الموافقة!",
      description: "تم خصم المبلغ من رصيد الطبيب",
    });

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

    toast({
      title: "تم الرفض",
      description: "تم رفض طلب السحب",
    });

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

        <Tabs defaultValue="deposits" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="deposits">الإيداع</TabsTrigger>
            <TabsTrigger value="withdrawals">السحب</TabsTrigger>
            <TabsTrigger value="active-doctors">الطلبات النشطة</TabsTrigger>
            <TabsTrigger value="doctors">الأطباء</TabsTrigger>
            <TabsTrigger value="users">المستخدمين</TabsTrigger>
          </TabsList>

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
                          onClick={() => handleWithdrawApprove(req.id, req.net_amount, req.doctors.user_id)}
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
