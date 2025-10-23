import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Copy, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const Doctors = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [transactionId, setTransactionId] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadDepartments();
    loadWallet();
  }, []);

  const loadDepartments = async () => {
    const { data } = await supabase
      .from("medical_departments")
      .select("*")
      .order("name_ar");
    
    setDepartments(data || []);
  };

  const loadWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      setWallet(data);
    }
  };

  const loadDoctors = async (deptId: string) => {
    const { data } = await supabase
      .from("doctors")
      .select("*, profiles(*)")
      .eq("department_id", deptId)
      .eq("is_active", true);
    
    setDoctors(data || []);
  };

  const handleDepartmentClick = (dept: any) => {
    setSelectedDept(dept);
    loadDoctors(dept.id);
  };

  const handleStartChat = async (doctor: any) => {
    if (!wallet || wallet.balance < doctor.price) {
      toast({
        title: "رصيد غير كافٍ",
        description: "يرجى إيداع رصيد كافٍ أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate transaction ID
      const id = generateTransactionId();
      
      // Deduct from wallet
      const newBalance = parseFloat(wallet.balance) - Number(doctor.price);
      await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user!.id);

      // Add to doctor's wallet
      const { data: doctorWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", doctor.user_id)
        .single();

      if (doctorWallet) {
        const doctorNewBalance = parseFloat(String(doctorWallet.balance)) + Number(doctor.price);
        await supabase
          .from("wallets")
          .update({ balance: doctorNewBalance })
          .eq("user_id", String(doctor.user_id));
      }

      // Create transaction
      await supabase
        .from("transactions")
        .insert({
          id: id,
          user_id: user!.id,
          doctor_id: doctor.id,
          amount: doctor.price,
          type: "consultation",
          description: `استشارة مع د. ${doctor.profiles.full_name}`
        });

      setTransactionId(id);
      setSelectedDoctor(doctor);
      
      toast({
        title: "تم الدفع بنجاح!",
        description: `تم خصم ${doctor.price} جنيه`,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateTransactionId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 7; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const getMessage = () => {
    const now = new Date().toLocaleString('ar-EG');
    return `لقد قمت بدفع ${selectedDoctor.price} جنيه إلى د. ${selectedDoctor.profiles.full_name} في تاريخ ${now} رقم العملية: ${transactionId}. من خلال تطبيق AI Egyptian Doctor.`;
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(getMessage());
    toast({
      title: "تم النسخ!",
      description: "تم نسخ الرسالة بنجاح",
    });
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(getMessage());
    const phone = selectedDoctor.whatsapp_number.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  if (!selectedDept) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4 pb-24">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ArrowRight className="w-4 h-4" />
              العودة
            </Button>
          </div>

          <h1 className="text-3xl font-bold text-center mb-8">اختر التخصص الطبي</h1>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {departments.map((dept) => (
              <Card
                key={dept.id}
                className="cursor-pointer hover:shadow-strong transition-all hover:-translate-y-1 animate-fade-in"
                onClick={() => handleDepartmentClick(dept)}
              >
                <CardHeader className="text-center">
                  <div className="text-5xl mb-4">{dept.icon}</div>
                  <CardTitle>{dept.name_ar}</CardTitle>
                  <CardDescription>{dept.name_en}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4 pb-24">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setSelectedDept(null)} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            العودة للتخصصات
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">{selectedDept.name_ar}</h1>
        <p className="text-center text-muted-foreground mb-8">
          رصيدك الحالي: <span className="font-bold text-primary">{wallet?.balance?.toFixed(2)} جنيه</span>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <Card key={doctor.id} className="shadow-medium animate-fade-in">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-2xl font-bold">
                    {doctor.profiles.full_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <CardTitle>د. {doctor.profiles.full_name}</CardTitle>
                    <CardDescription>{doctor.specialization_ar}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {doctor.bio_ar && (
                  <p className="text-sm text-muted-foreground mb-4">{doctor.bio_ar}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">{doctor.price} جنيه</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-gradient-to-r from-primary to-primary-light"
                        onClick={() => handleStartChat(doctor)}
                      >
                        بدء المحادثة
                      </Button>
                    </DialogTrigger>
                    {selectedDoctor && selectedDoctor.id === doctor.id && (
                      <DialogContent className="text-right">
                        <DialogHeader>
                          <DialogTitle>تم الدفع بنجاح! ✅</DialogTitle>
                          <DialogDescription>
                            رقم العملية: <span className="font-bold text-primary">{transactionId}</span>
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="p-4 bg-secondary rounded-lg text-sm">
                            {getMessage()}
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={copyMessage} variant="outline" className="flex-1 gap-2">
                              <Copy className="w-4 h-4" />
                              نسخ الرسالة
                            </Button>
                            <Button onClick={openWhatsApp} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                              <MessageCircle className="w-4 h-4" />
                              فتح واتساب
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Doctors;
