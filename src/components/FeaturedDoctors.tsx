import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import verifiedBadge from "@/assets/verified-badge.png";

interface Doctor {
  id: string;
  doctor_name: string;
  specialization_ar: string;
  image_url: string;
  consultation_fee: number;
  is_verified: boolean;
}

const FeaturedDoctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    loadFeaturedDoctors();
  }, []);

  const loadFeaturedDoctors = async () => {
    const { data } = await supabase
      .from("doctors")
      .select("*")
      .eq("is_active", true)
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (data) setDoctors(data);
  };

  if (doctors.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-foreground">⭐ أبرز الأطباء الموثقين</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {doctors.map((doctor) => (
          <Card 
            key={doctor.id} 
            className="rounded-3xl border-0 shadow-medium overflow-hidden hover:shadow-strong transition-all cursor-pointer"
          >
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="relative">
                  <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-primary/20">
                    <AvatarImage src={doctor.image_url} alt={doctor.doctor_name} />
                    <AvatarFallback className="text-lg sm:text-xl bg-gradient-to-br from-primary to-primary-light text-white">
                      {doctor.doctor_name?.charAt(0) || "د"}
                    </AvatarFallback>
                  </Avatar>
                  {doctor.is_verified && (
                    <img 
                      src={verifiedBadge} 
                      alt="موثق" 
                      className="w-4 h-4 sm:w-5 sm:h-5 absolute top-0 right-0 -translate-y-1 translate-x-1"
                    />
                  )}
                </div>
                <div className="w-full">
                  <h3 className="font-bold text-xs sm:text-sm line-clamp-1">{doctor.doctor_name}</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{doctor.specialization_ar}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-2 py-0.5">
                  {doctor.consultation_fee} ج
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FeaturedDoctors;
