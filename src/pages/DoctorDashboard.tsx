import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Stethoscope, Wallet, Search, LogOut, TrendingUp, Plus, PauseCircle, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DoctorDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchKind, setSearchKind] = useState<"transaction" | "withdraw" | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [newRequest, setNewRequest] = useState({
    doctor_name: "",
    phone_number: "",
    address: "",
    specialization_ar: "",
    department_id: "",
    consultation_fee: "",
    bio_ar: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkDoctor();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkDoctor = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    // Check if user is a doctor
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profile?.user_type !== "doctor") {
      navigate("/");
      return;
    }

    // Ensure doctor request approved before proceeding
    const { data: docReq } = await supabase
      .from('doctor_requests')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!docReq || docReq.status !== 'approved') {
      toast({
        title: 'غير موثق بعد',
        description: 'لا يمكنك الدخول. أرسل شهادتك لإثبات أنك طبيب وانتظر القبول.',
        variant: 'destructive',
      });
      navigate('/doctor-application');
      return;
    }

    // Get doctor info
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    setDoctor(doctorData);

    // Get wallet
    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    setWallet(walletData);

    // Get departments
    const { data: departmentsData } = await supabase
      .from("medical_departments")
      .select("*")
      .order("name_ar");

    setDepartments(departmentsData || []);

    // Get transactions
    if (doctorData) {
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select(`
          *,
          sender:profiles!user_id(
            full_name,
            avatar_url,
            phone,
            email
          )
        `)
        .eq("doctor_id", doctorData.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setTransactions(transactionsData || []);

      // Get withdraw requests
      const { data: withdrawData } = await supabase
        .from("withdraw_requests")
        .select("*")
        .eq("doctor_id", doctorData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setWithdrawRequests(withdrawData || []);
    }

    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchId) return;

    const id = searchId.trim();

    // Try transactions first (consultation/transfer)
    const { data: tx } = await supabase
      .from("transactions")
      .select(`
        *,
        sender:profiles!user_id(
          full_name,
          avatar_url,
          phone,
          email
        ),
        doctor:doctors(
          *,
          medical_departments(*)
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (tx) {
      setSearchKind("transaction");
      setSearchResult(tx);
      toast({ title: "تم العثور!", description: "تم العثور على العملية" });
      return;
    }

    // Try withdraw requests (limited to current doctor)
    if (doctor) {
      const { data: wd } = await supabase
        .from("withdraw_requests")
        .select("*")
        .eq("id", id)
        .eq("doctor_id", doctor.id)
        .maybeSingle();
      if (wd) {
        setSearchKind("withdraw");
        setSearchResult(wd);
        toast({ title: "تم العثور!", description: "تم العثور على طلب السحب" });
        return;
      }
    }

    setSearchKind(null);
    setSearchResult(null);
    toast({ title: "غير موجود", description: "لم يتم العثور على العملية", variant: "destructive" });
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !doctor) return;

    const netAmount = parseFloat(withdrawAmount); // النقاط الصافية التي سيستلمها الدكتور
    const commission = netAmount / 0.9 * 0.1; // عمولة النقاط
    const totalAmount = netAmount + commission; // إجمالي النقاط المخصومة

    if (totalAmount <= 0 || totalAmount > parseFloat(wallet.balance)) {
      toast({
        title: "خطأ",
        description: "المبلغ غير صحيح أو أكبر من الرصيد المتاح",
        variant: "destructive",
      });
      return;
    }

    try {
      await supabase
        .from("withdraw_requests")
        .insert({
          doctor_id: doctor.id,
          amount: totalAmount, // إجمالي النقاط التي ستُخصم
          net_amount: netAmount, // النقاط الصافية التي سيستلمها الدكتور
          commission: commission,
          status: "pending"
        });

      // Email doctor that withdraw was received
      try {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (prof?.email) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ type: 'withdraw_received', to: prof.email, data: { name: doctor.doctor_name, amount: netAmount } })
          });
        }
      } catch (_) {}

      toast({
        title: "تم الإرسال!",
        description: `تم إرسال طلب سحب ${netAmount.toFixed(0)} نقطة. سيتم خصم ${totalAmount.toFixed(0)} نقطة من رصيدك (شامل عمولة 10%)`,
      });

      setWithdrawAmount("");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleCreateRequest = async () => {
    if (!newRequest.doctor_name || !newRequest.phone_number || !newRequest.department_id || !newRequest.consultation_fee) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (doctor?.is_active) {
      toast({
        title: "تنبيه",
        description: "لديك طلب نشط بالفعل. قم بإيقافه أولاً لإنشاء طلب جديد",
        variant: "destructive",
      });
      return;
    }

    try {
      if (doctor) {
        // Update existing doctor
        await supabase
          .from("doctors")
          .update({
            doctor_name: newRequest.doctor_name,
            phone_number: newRequest.phone_number,
            address: newRequest.address,
            specialization_ar: newRequest.specialization_ar,
            department_id: newRequest.department_id,
            consultation_fee: parseFloat(newRequest.consultation_fee),
            bio_ar: newRequest.bio_ar,
            is_active: true,
          })
          .eq("id", doctor.id);
      } else {
        // Create new doctor
        const { error: insertError } = await supabase
          .from("doctors")
          .insert([{
            user_id: user.id,
            doctor_name: newRequest.doctor_name,
            phone_number: newRequest.phone_number,
            address: newRequest.address,
            specialization_ar: newRequest.specialization_ar,
            specialization_en: newRequest.specialization_ar,
            department_id: newRequest.department_id,
            consultation_fee: parseFloat(newRequest.consultation_fee),
            bio_ar: newRequest.bio_ar,
            is_active: true,
            price: parseFloat(newRequest.consultation_fee),
            whatsapp_number: newRequest.phone_number,
          }]);
        
        if (insertError) throw insertError;
      }

      toast({
        title: "تم!",
        description: "تم إنشاء الطلب بنجاح وأصبح نشطاً",
      });

      checkDoctor();
      setNewRequest({
        doctor_name: "",
        phone_number: "",
        address: "",
        specialization_ar: "",
        department_id: "",
        consultation_fee: "",
        bio_ar: ""
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleRequestStatus = async () => {
    if (!doctor) return;

    try {
      await supabase
        .from("doctors")
        .update({ is_active: !doctor.is_active })
        .eq("id", doctor.id);

      toast({
        title: doctor.is_active ? "تم الإيقاف" : "تم التفعيل",
        description: doctor.is_active ? "تم إيقاف الطلب" : "تم تفعيل الطلب",
      });

      checkDoctor();
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
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-medium">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">لوحة تحكم الدكتور</h1>
              <p className="text-sm text-muted-foreground">{doctor?.specialization_ar}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            تسجيل خروج
          </Button>
        </div>

        {/* Admin Notes Alerts for Withdraw Requests */}
        {withdrawRequests.filter(req => req.admin_notes && req.status !== 'pending').map((req) => (
          <Alert key={req.id} className="mb-4 bg-blue-50 border-blue-200 animate-fade-in">
            <AlertDescription className="text-blue-900 flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold mb-1">ملاحظة من الإدارة بخصوص طلب السحب {req.status === 'approved' ? 'المقبول' : 'المرفوض'}:</p>
                <p className="text-sm">{req.admin_notes}</p>
                <p className="text-xs mt-2 text-blue-700">الصافي: {req.net_amount} نقطة - {new Date(req.created_at).toLocaleDateString('ar-EG')}</p>
              </div>
            </AlertDescription>
          </Alert>
        ))}

        {/* Request Status Card */}
        {doctor && (
          <Card className="mb-6 shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>حالة الطلب</span>
                {doctor.is_active ? (
                  <span className="text-green-500 text-sm">● نشط</span>
                ) : (
                  <span className="text-gray-500 text-sm">● متوقف</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={toggleRequestStatus}
                variant={doctor.is_active ? "destructive" : "default"}
                className="w-full gap-2"
              >
                {doctor.is_active ? (
                  <>
                    <PauseCircle className="w-4 h-4" />
                    إيقاف الطلب
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    تفعيل الطلب
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-medium animate-slide-in-right">
            <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                رصيد النقاط
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-5xl font-bold text-primary">
                  {wallet?.balance?.toFixed(0) || "0"} <span className="text-2xl">نقطة</span>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-primary to-primary-light">
                      طلب سحب
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="text-right" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>طلب سحب رصيد</DialogTitle>
                      <DialogDescription>
                        سيتم خصم عمولة 10% من المبلغ
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="withdrawAmount">النقاط (الصافي)</Label>
                        <Input
                          id="withdrawAmount"
                          type="number"
                          min="1"
                          step="1"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          className="text-right"
                        />
                      </div>
                      {withdrawAmount && (
                        <div className="bg-secondary p-3 rounded-lg text-sm space-y-1">
                          <p>الصافي: <span className="font-bold text-primary">{parseFloat(withdrawAmount || '0').toFixed(0)} نقطة</span></p>
                          <p>العمولة (10%): {(parseFloat(withdrawAmount || '0') / 0.9 * 0.1).toFixed(0)} نقطة</p>
                          <p className="font-bold text-destructive border-t pt-2 mt-2">
                            سيتم خصم: {(parseFloat(withdrawAmount || '0') / 0.9).toFixed(0)} نقطة من رصيدك
                          </p>
                        </div>
                      )}
                      <Button onClick={handleWithdraw} className="w-full">
                        تأكيد طلب السحب
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium animate-slide-in-right">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                إجمالي الاستشارات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-primary">{transactions.length}</div>
                <p className="text-sm text-muted-foreground mt-2">استشارة مكتملة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Requests */}
        <Tabs defaultValue="consultations" className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="consultations">الاستشارات</TabsTrigger>
            <TabsTrigger value="new-request">إنشاء طلب جديد</TabsTrigger>
          </TabsList>

          <TabsContent value="consultations" className="space-y-6">
            {/* Search Box */}
            <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              البحث بالعملية
            </CardTitle>
            <CardDescription>ابحث عن عملية باستخدام رقم العملية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="أدخل رقم العملية..."
                className="text-right"
              />
              <Button onClick={handleSearch}>بحث</Button>
            </div>
            {searchResult && (
              <div className="mt-4 p-4 bg-secondary rounded-lg space-y-2">
                {searchKind === 'transaction' && (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarImage src={searchResult.sender?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white">
                          {searchResult.sender?.full_name?.charAt(0) || 'م'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{searchResult.sender?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {searchResult.sender?.phone && `📱 ${searchResult.sender?.phone}`}
                          {searchResult.sender?.email && <span className="block">{searchResult.sender?.email}</span>}
                        </p>
                      </div>
                    </div>
                        <p><strong>النقاط:</strong> {searchResult.amount} نقطة</p>
                    <p><strong>التاريخ:</strong> {new Date(searchResult.created_at).toLocaleString('ar-EG')}</p>
                    {searchResult.description && <p><strong>الوصف:</strong> {searchResult.description}</p>}
                    {searchResult.doctor && (
                      <div className="mt-2 p-2 rounded-md bg-background">
                        <p className="font-semibold">بيانات الطبيب</p>
                        <p className="text-sm">{searchResult.doctor?.doctor_name} • {searchResult.doctor?.medical_departments?.name_ar}</p>
                      </div>
                    )}
                  </>
                )}
                {searchKind === 'withdraw' && (
                  <>
                    <p><strong>نوع:</strong> طلب سحب</p>
                    <p><strong>الإجمالي:</strong> {searchResult.amount} نقطة</p>
                    <p><strong>الصافي:</strong> {searchResult.net_amount} نقطة</p>
                    <p><strong>العمولة:</strong> {searchResult.commission} نقطة</p>
                    <p><strong>الحالة:</strong> {searchResult.status}</p>
                    <p><strong>التاريخ:</strong> {new Date(searchResult.created_at).toLocaleString('ar-EG')}</p>
                    {searchResult.admin_notes && <p><strong>ملاحظات الإدارة:</strong> {searchResult.admin_notes}</p>}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

            {/* Recent Transactions */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle>آخر الاستشارات</CardTitle>
                <CardDescription>المستخدمين الذين تواصلوا معك</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarImage src={transaction.sender?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-white">
                          {transaction.sender?.full_name?.charAt(0) || 'م'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{transaction.sender?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.sender?.phone && `📱 ${transaction.sender?.phone}`}
                          {transaction.sender?.email && <span className="block">{transaction.sender?.email}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleString('ar-EG')}
                        </p>
                        <p className="text-xs text-muted-foreground">رقم العملية: {transaction.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{transaction.amount} نقطة</p>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">لا توجد استشارات بعد</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="new-request">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  إنشاء طلب جديد
                </CardTitle>
                <CardDescription>
                  {doctor?.is_active ? 
                    "لديك طلب نشط بالفعل. قم بإيقافه أولاً لإنشاء طلب جديد" : 
                    "املأ البيانات لإنشاء طلب جديد وظهوره للمستخدمين"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doctor_name">اسم الطبيب *</Label>
                  <Input
                    id="doctor_name"
                    value={newRequest.doctor_name}
                    onChange={(e) => setNewRequest({...newRequest, doctor_name: e.target.value})}
                    placeholder="د. محمد أحمد"
                    className="text-right"
                    disabled={doctor?.is_active}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">رقم التليفون *</Label>
                  <Input
                    id="phone_number"
                    value={newRequest.phone_number}
                    onChange={(e) => setNewRequest({...newRequest, phone_number: e.target.value})}
                    placeholder="+201234567890"
                    className="text-right"
                    disabled={doctor?.is_active}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">العنوان</Label>
                  <Input
                    id="address"
                    value={newRequest.address}
                    onChange={(e) => setNewRequest({...newRequest, address: e.target.value})}
                    placeholder="القاهرة، مصر"
                    className="text-right"
                    disabled={doctor?.is_active}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">التخصص / القسم *</Label>
                  <Select 
                    value={newRequest.department_id} 
                    onValueChange={(value) => {
                      const dept = departments.find(d => d.id === value);
                      setNewRequest({
                        ...newRequest, 
                        department_id: value,
                        specialization_ar: dept?.name_ar || ""
                      });
                    }}
                    disabled={doctor?.is_active}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر التخصص" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultation_fee">سعر الاستشارة (نقطة) *</Label>
                  <Input
                    id="consultation_fee"
                    type="number"
                    min="1"
                    value={newRequest.consultation_fee}
                    onChange={(e) => setNewRequest({...newRequest, consultation_fee: e.target.value})}
                    placeholder="100"
                    className="text-right"
                    disabled={doctor?.is_active}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة عنك</Label>
                  <Textarea
                    id="bio"
                    value={newRequest.bio_ar}
                    onChange={(e) => setNewRequest({...newRequest, bio_ar: e.target.value})}
                    placeholder="نبذة مختصرة عن خبرتك وتخصصك..."
                    className="text-right min-h-[100px]"
                    disabled={doctor?.is_active}
                  />
                </div>

                <Button 
                  onClick={handleCreateRequest}
                  className="w-full bg-gradient-to-r from-primary to-primary-light"
                  disabled={doctor?.is_active}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إنشاء الطلب
                </Button>

                {doctor?.is_active && (
                  <p className="text-sm text-center text-muted-foreground">
                    لديك طلب نشط. قم بإيقافه من أعلى الصفحة لإنشاء طلب جديد
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default DoctorDashboard;
