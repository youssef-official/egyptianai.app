import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const Doctors = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    const { data } = await supabase
      .from("doctors")
      .select("*, profiles(avatar_url)")
      .eq("is_active", true)
      .order("is_verified", { ascending: false });

    setDoctors(data || []);
  };

  const handleStartChat = (doctorId: string) => {
    navigate(`/consultation?doctorId=${doctorId}`);
  };

  return (
    <div className="min-h-screen bg-ios-light-gray pb-28">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">Find Your Doctor</h1>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="w-6 h-6 text-gray-600" />
          </Button>
        </header>

        {/* Doctor List */}
        <div className="space-y-4">
          {doctors.map((doctor) => (
            <Card
              key={doctor.id}
              className="p-4 bg-white rounded-2xl shadow-md"
            >
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={doctor.image_url || doctor.profiles?.avatar_url || '/placeholder.svg'} />
                    <AvatarFallback>{doctor.doctor_name?.charAt(0) || 'D'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-bold">{doctor.doctor_name}</h3>
                    <p className="text-sm text-gray-500">{doctor.specialization_ar}</p>
                  </div>
                </div>
                <Button onClick={() => handleStartChat(doctor.id)} size="sm">
                  Book Now
                </Button>
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
