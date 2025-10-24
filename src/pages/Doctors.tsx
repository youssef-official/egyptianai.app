import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

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
      .select("*, profiles(*)")
      .eq("department_id", deptId)
      .eq("is_active", true)
      .order("is_verified", { ascending: false });
    
    setDoctors(data || []);
  };

  const handleDepartmentClick = (dept: any) => {
    setSelectedDept(dept);
    loadDoctors(dept.id);
  };

  const handleStartChat = (doctor: any) => {
    navigate(`/consultation?doctorId=${doctor.id}`);
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

        {doctors.filter(d => d.is_verified).length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-center mb-4 text-primary">✨ أبرز الأطباء الموثقين</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              {doctors.filter(d => d.is_verified).map((doctor) => (
                <Card key={doctor.id} className="shadow-strong animate-fade-in hover:shadow-glow transition-all border-2 border-primary/30">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="relative">
                        {doctor.image_url ? (
                          <img 
                            src={doctor.image_url} 
                            alt={doctor.doctor_name}
                            className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-3xl font-bold border-4 border-primary">
                            {doctor.doctor_name?.charAt(0) || 'د'}
                          </div>
                        )}
                        <div className="absolute -top-1 -right-1">
                          <img src="/src/assets/verified-badge.png" alt="موثق" className="w-8 h-8" />
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{doctor.doctor_name}</CardTitle>
                        <CardDescription className="text-sm mt-1">{doctor.specialization_ar}</CardDescription>
                        {doctor.phone_number && (
                          <p className="text-xs text-muted-foreground mt-1">📱 {doctor.phone_number}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {doctor.bio_ar && (
                      <p className="text-sm text-muted-foreground text-center line-clamp-2">{doctor.bio_ar}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xl font-bold text-primary">{doctor.consultation_fee || doctor.price} جنيه</span>
                      <Button 
                        className="bg-gradient-to-r from-primary to-primary-light"
                        onClick={() => handleStartChat(doctor)}
                      >
                        بدء الاستشارة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {doctors.filter(d => !d.is_verified).length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-center mb-4">الأطباء المتاحون</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {doctors.filter(d => !d.is_verified).map((doctor) => (
                <Card key={doctor.id} className="shadow-medium animate-fade-in hover:shadow-strong transition-all">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="relative">
                        {doctor.image_url ? (
                          <img 
                            src={doctor.image_url} 
                            alt={doctor.doctor_name}
                            className="w-20 h-20 rounded-full object-cover border-4 border-primary/20"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-3xl font-bold border-4 border-primary/20">
                            {doctor.doctor_name?.charAt(0) || 'د'}
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{doctor.doctor_name}</CardTitle>
                        <CardDescription className="text-sm mt-1">{doctor.specialization_ar}</CardDescription>
                        {doctor.phone_number && (
                          <p className="text-xs text-muted-foreground mt-1">📱 {doctor.phone_number}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {doctor.bio_ar && (
                      <p className="text-sm text-muted-foreground text-center line-clamp-2">{doctor.bio_ar}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xl font-bold text-primary">{doctor.consultation_fee || doctor.price} جنيه</span>
                      <Button 
                        className="bg-gradient-to-r from-primary to-primary-light"
                        onClick={() => handleStartChat(doctor)}
                      >
                        بدء الاستشارة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Doctors;
