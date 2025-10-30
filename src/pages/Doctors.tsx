import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Stethoscope } from "lucide-react";
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
      <div className="min-h-screen bg-gray-50 p-6 pb-24">
        <div className="container mx-auto max-w-md">
          <div className="mb-6">
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Find Your Doctor</h1>

          <div className="grid grid-cols-3 gap-4">
            {departments.map((dept, idx) => (
              <div
                key={dept.id}
                className="cursor-pointer hover-scale animate-fade-in"
                style={{animationDelay: `${idx * 0.05}s`}}
                onClick={() => handleDepartmentClick(dept)}
              >
                <div className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center text-3xl">
                      {dept.icon}
                    </div>
                    <p className="text-xs font-semibold text-gray-700 line-clamp-2">{dept.name_en}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="container mx-auto max-w-md">
        <div className="mb-6">
          <button 
            onClick={() => setSelectedDept(null)} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedDept.name_en}</h1>
          <p className="text-sm text-gray-500">
            Your balance: <span className="font-semibold text-primary">{wallet?.balance?.toFixed(0)} points</span>
          </p>
        </div>

        {doctors.filter(d => d.is_verified).length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>Popular Doctors</span>
              <span className="text-sm font-normal text-gray-500">({doctors.filter(d => d.is_verified).length})</span>
            </h3>
            <div className="space-y-3">
              {doctors.filter(d => d.is_verified).map((doctor, idx) => (
                <Card key={doctor.id} className="cursor-pointer hover:shadow-lg transition-all animate-fade-in rounded-2xl border-0 shadow-md overflow-hidden bg-white hover-lift"
                  style={{animationDelay: `${idx * 0.05}s`}}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-16 h-16 border-2 border-gray-100">
                          <AvatarImage src={doctor.image_url || doctor.profiles?.avatar_url || '/placeholder.svg'} className="object-cover" loading="lazy" />
                          <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-primary-light text-white">
                            {doctor.doctor_name?.charAt(0) || 'د'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">{doctor.doctor_name}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-1">{doctor.specialization_ar}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-500">⭐ 5.0</span>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-primary font-semibold">{doctor.price} pts</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleStartChat(doctor.id)}
                        className="flex-shrink-0 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md"
                      >
                        Book
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {doctors.filter(d => !d.is_verified).length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Available Doctors</h3>
            <div className="space-y-3">
              {doctors.filter(d => !d.is_verified).map((doctor, idx) => (
                <Card key={doctor.id} className="cursor-pointer hover:shadow-lg transition-all animate-fade-in rounded-2xl border-0 shadow-md overflow-hidden bg-white hover-lift"
                  style={{animationDelay: `${idx * 0.05}s`}}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16 flex-shrink-0 border-2 border-gray-100">
                        <AvatarImage src={doctor.image_url || doctor.profiles?.avatar_url || '/placeholder.svg'} className="object-cover" loading="lazy" />
                        <AvatarFallback className="text-lg bg-gradient-to-br from-gray-400 to-gray-500 text-white">
                          {doctor.doctor_name?.charAt(0) || 'د'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">{doctor.doctor_name}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-1">{doctor.specialization_ar}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-primary font-semibold">{doctor.price} pts</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleStartChat(doctor.id)}
                        className="flex-shrink-0 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md"
                      >
                        Book
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {doctors.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500">No doctors available in this department</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Doctors;
