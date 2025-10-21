import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Shield, UserX, CheckCircle, XCircle, Wallet, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalBalance: 0, totalCommissions: 0 });
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");
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

    setIsAdmin(true);
    loadData();
    setLoading(false);
  };

  const loadData = async () => {
    // Load deposit requests
    const { data: deposits } = await supabase
      .from("deposit_requests")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false });

    // Load withdraw requests
    const { data: withdraws } = await supabase
      .from("withdraw_requests")
      .select("*, doctors(*, profiles(*))")
      .order("created_at", { ascending: false });

    // Load users
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*, wallets(*)")
      .order("created_at", { ascending: false });

    // Calculate stats
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
    setStats({
      totalUsers: usersData?.length || 0,
      totalBalance,
      totalCommissions,
    });
  };

  const handleDepositAction = async (requestId: string, action: 'approved' | 'rejected', amount?: number, userId?: string) => {
    try {
      await supabase
        .from("deposit_requests")
        .update({
          status: action,
          admin_notes: adminNotes,
        })
        .eq("id", requestId);

      if (action === 'approved' && amount && userId) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", userId)
          .single();

        if (wallet) {
          const newBalance = parseFloat(String(wallet.balance)) + amount;
          await supabase
            .from("wallets")
            .update({ balance: newBalance })
            .eq("user_id", userId);
        }
      }

      toast({
        title: action === 'approved' ? "تمت الموافقة" : "تم الرفض",
        description: `تم ${action === 'approved' ? 'الموافقة على' : 'رفض'} الطلب`,
      });

      setAdminNotes("");
      loadData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleWithdrawAction = async (requestId: string, action: 'approved' | 'rejected', netAmount?: number, doctorId?: string) => {
    try {
      await supabase
        .from("withdraw_requests")
        .update({
          status: action,
          admin_notes: adminNotes,
        })
        .eq("id", requestId);

      if (action === 'approved' && netAmount && doctorId) {
        const { data: doctor } = await supabase
          .from("doctors")
          .select("user_id")
          .eq("id", doctorId)
          .single();

        if (doctor) {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", doctor.user_id)
            .single();

          if (wallet) {
            const newBalance = parseFloat(String(wallet.balance)) - netAmount;
            await supabase
              .from("wallets")
              .update({ balance: newBalance })
              .eq("user_id", doctor.user_id);
          }
        }
      }

      toast({
        title: action === 'approved' ? "تمت الموافقة" : "تم الرفض",
        description: `تم ${action === 'approved' ? 'الموافقة على' : 'رفض'} الطلب`,
      });

      setAdminNotes("");
      loadData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">جاري التحميل...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-strong">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">لوحة تحكم المشرف</h1>
            <p className="text-sm text-muted-foreground">إدارة المنصة بالكامل</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-medium rounded-3xl border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="shadow-medium rounded-3xl border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الرصيد</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalBalance.toFixed(2)} جنيه</div>
            </CardContent>
          </Card>

          <Card className="shadow-medium rounded-3xl border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">العمولات</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalCommissions.toFixed(2)} جنيه</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="deposits" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="deposits" className="rounded-xl">طلبات الإيداع</TabsTrigger>
            <TabsTrigger value="withdraws" className="rounded-xl">طلبات السحب</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl">المستخدمين</TabsTrigger>
          </TabsList>

          <TabsContent value="deposits" className="space-y-4">
            {depositRequests.map((request) => (
              <Card key={request.id} className="shadow-medium rounded-3xl border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.profiles?.full_name}</CardTitle>
                      <CardDescription>
                        {request.payment_method} • {new Date(request.created_at).toLocaleDateString('ar-EG')}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      request.status === 'approved' ? 'default' :
                      request.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {request.status === 'pending' ? 'قيد الانتظار' :
                       request.status === 'approved' ? 'مقبول' : 'مرفوض'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-primary">{request.amount} جنيه</div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full rounded-full" onClick={() => setSelectedImage(request.proof_image_url)}>
                        عرض إثبات الدفع
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>إثبات الدفع</DialogTitle>
                      </DialogHeader>
                      <img src={selectedImage} alt="Proof" className="w-full rounded-lg" />
                    </DialogContent>
                  </Dialog>

                  {request.status === 'pending' && (
                    <>
                      <Textarea
                        placeholder="ملاحظات المشرف (اختياري)..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="rounded-2xl"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDepositAction(request.id, 'approved', request.amount, request.user_id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 rounded-full"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          موافقة
                        </Button>
                        <Button
                          onClick={() => handleDepositAction(request.id, 'rejected')}
                          variant="destructive"
                          className="flex-1 rounded-full"
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

          <TabsContent value="withdraws" className="space-y-4">
            {withdrawRequests.map((request) => (
              <Card key={request.id} className="shadow-medium rounded-3xl border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">د. {request.doctors?.profiles?.full_name}</CardTitle>
                      <CardDescription>
                        {new Date(request.created_at).toLocaleDateString('ar-EG')}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      request.status === 'approved' ? 'default' :
                      request.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {request.status === 'pending' ? 'قيد الانتظار' :
                       request.status === 'approved' ? 'مقبول' : 'مرفوض'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>المبلغ المطلوب:</span>
                      <span className="font-bold">{request.amount} جنيه</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>العمولة (10%):</span>
                      <span className="font-bold">-{request.commission} جنيه</span>
                    </div>
                    <div className="flex justify-between text-xl pt-2 border-t">
                      <span>المبلغ الصافي:</span>
                      <span className="font-bold text-primary">{request.net_amount} جنيه</span>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <>
                      <Textarea
                        placeholder="ملاحظات المشرف (اختياري)..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="rounded-2xl"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleWithdrawAction(request.id, 'approved', request.amount, request.doctor_id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 rounded-full"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          موافقة
                        </Button>
                        <Button
                          onClick={() => handleWithdrawAction(request.id, 'rejected')}
                          variant="destructive"
                          className="flex-1 rounded-full"
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

          <TabsContent value="users" className="space-y-4">
            {users.map((user) => (
              <Card key={user.id} className="shadow-medium rounded-3xl border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{user.full_name}</CardTitle>
                      <CardDescription>{user.phone}</CardDescription>
                    </div>
                    <Badge variant={user.user_type === 'doctor' ? 'default' : 'secondary'}>
                      {user.user_type === 'doctor' ? 'دكتور' : 'مستخدم'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>الرصيد:</span>
                    <span className="font-bold text-primary">{user.wallets?.balance || 0} جنيه</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>معرف المستخدم: <code className="font-mono">{user.id}</code></div>
                    <div>تاريخ التسجيل: {new Date(user.created_at).toLocaleDateString('ar-EG')}</div>
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
