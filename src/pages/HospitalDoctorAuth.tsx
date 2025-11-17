import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope } from "lucide-react";

const HospitalDoctorAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: doctor, error } = await supabase
        .from('hospital_doctors')
        .select('id, doctor_name, doctor_email, doctor_password')
        .eq('doctor_email', email)
        .single();
      if (error || !doctor) throw new Error('بيانات الدخول غير صحيحة');
      if (doctor.doctor_password !== password) throw new Error('كلمة المرور غير صحيحة');

      localStorage.setItem('hospitalDoctorSession', JSON.stringify({ doctorId: doctor.id }));
      toast({ title: `مرحباً د. ${doctor.doctor_name}` });
      navigate('/hospital-doctor-dashboard');
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 flex items-center justify-center">
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-strong">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>تسجيل دخول الأطباء</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-2xl" />
            </div>
            <div>
              <Label>كلمة المرور</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-2xl" />
            </div>
            <Button type="submit" className="w-full rounded-2xl" disabled={loading}>
              {loading ? 'جاري الدخول...' : 'دخول'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default HospitalDoctorAuth;
