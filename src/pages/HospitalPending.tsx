import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Clock, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

const HospitalPending = () => {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    checkStatus();
    
    const channel = supabase
      .channel('hospital-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hospital_requests'
        },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login-hospital");
      return;
    }

    const { data: request } = await supabase
      .from("hospital_requests")
      .select("status, admin_notes")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (request) {
      setStatus(request.status as "pending" | "approved" | "rejected");
      setAdminNotes(request.admin_notes || "");
      
      if (request.status === "approved") {
        setTimeout(() => navigate("/hospital-dashboard"), 2000);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login-hospital");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-cyan-100 to-white flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <Card className="w-full max-w-lg shadow-strong rounded-3xl border-0 bg-white/80 backdrop-blur">
          <CardHeader className="text-center pb-8">
            <div className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-glow">
              {status === "pending" && <Clock className="w-14 h-14 text-white animate-pulse" />}
              {status === "approved" && <CheckCircle className="w-14 h-14 text-white" />}
              {status === "rejected" && <XCircle className="w-14 h-14 text-white" />}
            </div>
            <CardTitle className="text-3xl font-extrabold text-foreground">
              {status === "pending" && "طلبك قيد المراجعة"}
              {status === "approved" && "تم قبول طلبك! 🎉"}
              {status === "rejected" && "تم رفض الطلب"}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-4">
              {status === "pending" && "سيتم مراجعة مستنداتك والرد عليك في أقرب وقت ممكن"}
              {status === "approved" && "يمكنك الآن الوصول إلى لوحة التحكم الخاصة بالمستشفى"}
              {status === "rejected" && "للأسف، لم يتم قبول طلبك في الوقت الحالي"}
            </CardDescription>
          </CardHeader>

          {adminNotes && (
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-2xl">
                <h3 className="font-semibold mb-2">ملاحظات الإدارة:</h3>
                <p className="text-sm text-muted-foreground">{adminNotes}</p>
              </div>
            </CardContent>
          )}

          <CardContent className="pt-4">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full rounded-2xl h-12"
            >
              تسجيل الخروج
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default HospitalPending;
