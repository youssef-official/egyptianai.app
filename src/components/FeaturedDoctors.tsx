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
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4 text-center">⭐ أبرز الأطباء الموثقين</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {doctors.map((doctor) => (
          <Card key={doctor.id} className="rounded-3xl border-0 shadow-medium overflow-hidden hover:shadow-strong transition-all">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-4 border-primary/20">
                    <AvatarImage src={doctor.image_url} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary-light text-white">
                      {doctor.doctor_name?.charAt(0) || "د"}
                    </AvatarFallback>
                  </Avatar>
                  {doctor.is_verified && (
                    <img 
                      src={verifiedBadge} 
                      alt="موثق" 
                      className="w-6 h-6 absolute -bottom-1 -right-1"
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{doctor.doctor_name}</h3>
                  <p className="text-xs text-muted-foreground">{doctor.specialization_ar}</p>
                </div>
                <Badge className="bg-gradient-to-r from-primary to-primary-light">
                  {doctor.consultation_fee} جنيه
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
