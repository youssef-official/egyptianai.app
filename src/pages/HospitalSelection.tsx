import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, ArrowLeft, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";

const HospitalSelection = () => {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from("hospitals")
        .select("*")
        .eq("is_approved", true)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setHospitals(data || []);
    } catch (error) {
      console.error("Error loading hospitals:", error);
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { text: string; variant: "default" | "secondary" | "destructive" } } = {
      empty: { text: "فاضي 🟢", variant: "default" },
      low_traffic: { text: "زحمة قليلة 🟡", variant: "secondary" },
      medium_traffic: { text: "متوسط الزحمة 🟠", variant: "secondary" },
      high_traffic: { text: "زحمة عالية 🔴", variant: "destructive" },
      very_crowded: { text: "زحمة جداً 🔴🔴", variant: "destructive" },
    };
    
    const status_info = statusMap[status] || statusMap.medium_traffic;
    return <Badge variant={status_info.variant}>{status_info.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>حجز مع أقرب مستشفى - Cura Verse</title>
        <meta name="description" content="اختر المستشفى الأنسب لك من بين مجموعة من المستشفيات المعتمدة واحجز موعدك مع أفضل الأطباء في مصر" />
        <meta name="keywords" content="حجز مستشفى, مستشفيات مصر, حجز طبيب, استشارة طبية, رعاية صحية" />
        <link rel="canonical" href="https://www.egyptianai.app/hospital-selection" />
        <meta property="og:title" content="حجز مع أقرب مستشفى - Cura Verse" />
        <meta property="og:description" content="اختر المستشفى الأنسب لك واحجز موعدك مع أفضل الأطباء" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="mb-6 gap-2 hover-scale rounded-2xl"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              اختر المستشفى المناسب
            </h1>
            <p className="text-muted-foreground text-lg">
              اختر من بين أفضل المستشفيات المعتمدة لدينا
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hospitals.map((hospital, index) => (
              <motion.div
                key={hospital.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  onClick={() => navigate(`/hospital-booking?hospitalId=${hospital.id}`)}
                  className="cursor-pointer hover-lift shadow-strong rounded-3xl border-0 overflow-hidden group h-full"
                >
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {hospital.logo_url ? (
                        <img
                          src={hospital.logo_url}
                          alt={`شعار ${hospital.name}`}
                          className="w-20 h-20 rounded-2xl object-cover shadow-md group-hover:scale-110 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
                          <Building2 className="w-10 h-10 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {hospital.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {getStatusBadge(hospital.status)}
                          <div className="flex items-center gap-1 text-sm text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-semibold">4.5</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{hospital.phone}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {hospitals.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد مستشفيات متاحة حالياً</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HospitalSelection;
