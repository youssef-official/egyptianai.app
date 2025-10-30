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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Recommend Doctor</h2>
        <button className="text-sm text-primary font-medium">See All</button>
      </div>
      <div className="space-y-4">
        {doctors.slice(0, 3).map((doctor, idx) => (
          <Card 
            key={doctor.id} 
            className="rounded-2xl border-0 shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer bg-white hover-lift animate-fade-in"
            style={{animationDelay: `${idx * 0.1}s`}}
            onClick={() => window.location.assign(`/consultation?doctorId=${doctor.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-16 h-16 border-2 border-gray-100">
                    <AvatarImage src={doctor.image_url || (doctor as any).profiles?.avatar_url || '/placeholder.svg'} alt={doctor.doctor_name} loading="lazy" className="object-cover" />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-primary-light text-white">
                      {doctor.doctor_name?.charAt(0) || "د"}
                    </AvatarFallback>
                  </Avatar>
                  {doctor.is_verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">{doctor.doctor_name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-1">{doctor.specialization_ar}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">⭐ 5.0</span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-500">5 years experience</span>
                  </div>
                </div>
                <button className="flex-shrink-0 bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-md">
                  Visit Now
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FeaturedDoctors;
