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
      .select("*, profiles(avatar_url)")
      .eq("is_active", true)
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (data) setDoctors(data as any);
  };

  if (doctors.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-foreground">⭐ أبرز الأطباء الموثقين</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {doctors.map((doctor) => (
          <Card 
            key={doctor.id} 
            className="rounded-3xl border-0 shadow-medium overflow-hidden hover:shadow-strong transition-all cursor-pointer bg-gradient-to-b from-background to-primary/5 hover-lift"
            onClick={() => window.location.assign(`/consultation?doctorId=${doctor.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <Avatar className="w-18 h-18 sm:w-20 sm:h-20 border-2 border-primary/30 shadow-inner">
                    <AvatarImage src={doctor.image_url || (doctor as any).profiles?.avatar_url || '/placeholder.svg'} alt={doctor.doctor_name} loading="lazy" className="object-cover" />
                    <AvatarFallback className="text-lg sm:text-xl bg-gradient-to-br from-primary to-primary-light text-white">
                      {doctor.doctor_name?.charAt(0) || "د"}
                    </AvatarFallback>
                  </Avatar>
                  {doctor.is_verified && (
                    <img 
                      src={verifiedBadge} 
                      alt="موثق" 
                      className="w-6 h-6 sm:w-7 sm:h-7 absolute -top-1 -right-1 drop-shadow-md"
                    />
                  )}
                </div>
                <div className="w-full">
                  <h3 className="font-bold text-sm sm:text-base line-clamp-1">{doctor.doctor_name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{doctor.specialization_ar}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs px-3 py-1 rounded-full">
                    {doctor.consultation_fee} نقطة
                  </Badge>
                  <Badge variant="default" className="text-xs px-3 py-1 rounded-full">
                    موثق
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FeaturedDoctors;
