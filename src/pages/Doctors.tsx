import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import verifiedBadge from "@/assets/verified-badge.png";

const Doctors = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
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
      .select("*, profiles(avatar_url)")
      .eq("department_id", deptId)
      .eq("is_active", true)
      .order("is_verified", { ascending: false });
    
    setDoctors(data || []);
  };

  const handleDepartmentClick = (dept: any) => {
    setSelectedDept(dept);
    loadDoctors(dept.id);
  };

  const handleStartChat = (doctorId: string) => {
    navigate(`/consultation?doctorId=${doctorId}`);
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
          رصيدك الحالي: <span className="font-bold text-primary">{wallet?.balance?.toFixed(0)} نقطة</span>
        </p>

        {doctors.filter(d => d.is_verified).length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <img src={verifiedBadge} alt="" className="w-6 h-6" />
              الأطباء الموثقون
            </h3>
            <div className="space-y-4">
              {doctors.filter(d => d.is_verified).map((doctor) => (
                <Card key={doctor.id} className="cursor-pointer hover:shadow-strong transition-all hover:scale-[1.01] animate-fade-in rounded-2xl border-0 shadow-medium overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <Avatar className="w-20 h-20 flex-shrink-0 border-3 border-primary shadow-lg ml-2 order-2 md:order-1 md:ml-0">
                      <AvatarImage src={doctor.image_url || doctor.profiles?.avatar_url || '/placeholder.svg'} className="object-cover" loading="lazy" />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary-light text-white">
                        {doctor.doctor_name?.charAt(0) || 'د'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0 order-1 md:order-2">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold truncate">{doctor.doctor_name}</h3>
                        <img src={verifiedBadge} alt="Verified" className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{doctor.specialization_ar}</p>
                      {doctor.bio_ar && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{doctor.bio_ar}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xl font-bold text-primary">{doctor.price} نقطة</span>
                        <Button 
                          onClick={() => handleStartChat(doctor.id)}
                          className="bg-gradient-to-r from-primary to-primary-light hover:shadow-glow rounded-full h-9 px-6"
                          size="sm"
                        >
                          ابدأ الاستشارة
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {doctors.filter(d => !d.is_verified).length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4">الأطباء المتاحون</h3>
            <div className="space-y-4">
              {doctors.filter(d => !d.is_verified).map((doctor) => (
                <Card key={doctor.id} className="cursor-pointer hover:shadow-strong transition-all hover:scale-[1.01] animate-fade-in rounded-2xl border-0 shadow-medium overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <Avatar className="w-20 h-20 flex-shrink-0 border-3 border-gray-300 shadow-lg ml-2 order-2 md:order-1 md:ml-0">
                      <AvatarImage src={doctor.image_url || doctor.profiles?.avatar_url || '/placeholder.svg'} className="object-cover" loading="lazy" />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-gray-400 to-gray-500 text-white">
                        {doctor.doctor_name?.charAt(0) || 'د'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0 order-1 md:order-2">
                      <h3 className="text-lg font-bold mb-1 truncate">{doctor.doctor_name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{doctor.specialization_ar}</p>
                      {doctor.bio_ar && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{doctor.bio_ar}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xl font-bold text-primary">{doctor.price} نقطة</span>
                        <Button 
                          onClick={() => handleStartChat(doctor.id)}
                          className="bg-gradient-to-r from-primary to-primary-light hover:shadow-glow rounded-full h-9 px-6"
                          size="sm"
                        >
                          ابدأ الاستشارة
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {doctors.length === 0 && (
          <p className="text-center text-muted-foreground py-8">لا يوجد أطباء في هذا القسم حالياً</p>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Doctors;
