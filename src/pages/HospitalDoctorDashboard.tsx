import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LogOut, Calendar, DollarSign } from "lucide-react";

const HospitalDoctorDashboard = () => {
  const [doctor, setDoctor] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadDoctorData();
  }, []);

  const loadDoctorData = async () => {
    try {
      const raw = localStorage.getItem('hospitalDoctorSession');
      const session = raw ? JSON.parse(raw) : null;
      const doctorId = session?.doctorId as string | undefined;
      if (!doctorId) {
        navigate('/hospital-doctor');
        return;
      }

      const { data: doctorData } = await supabase
        .from('hospital_doctors')
        .select('*, hospitals(name)')
        .eq('id', doctorId)
        .single();

      if (!doctorData) {
        toast({ title: 'خطأ', description: 'لم يتم العثور على حساب الطبيب', variant: 'destructive' });
        navigate('/hospital-doctor');
        return;
      }

      if (!doctorData) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على حساب الطبيب",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setDoctor(doctorData);

      const { data: bookingsData } = await supabase
        .from("hospital_bookings")
        .select("*")
        .eq("doctor_id", doctorData.id)
        .order("created_at", { ascending: false });

      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error loading doctor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('hospitalDoctorSession');
    navigate('/hospital-doctor');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={doctor?.image_url} />
              <AvatarFallback>{doctor?.doctor_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">د. {doctor?.doctor_name}</h1>
              <p className="text-muted-foreground">{doctor?.specialization}</p>
              <p className="text-sm text-muted-foreground">{doctor?.hospitals?.name}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="shadow-strong rounded-3xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                إجمالي الحجوزات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{bookings.length}</p>
            </CardContent>
          </Card>

          <Card className="shadow-strong rounded-3xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                سعر الكشف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{doctor?.consultation_price} جنيه</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-strong rounded-3xl border-0">
          <CardHeader>
            <CardTitle>آخر الحجوزات</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الحجز</TableHead>
                  <TableHead>اسم المريض</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono">{booking.id}</TableCell>
                    <TableCell>{booking.patient_name}</TableCell>
                    <TableCell>{booking.patient_phone}</TableCell>
                    <TableCell>{booking.patient_area || "-"}</TableCell>
                    <TableCell>{booking.price} جنيه</TableCell>
                    <TableCell>{new Date(booking.created_at).toLocaleDateString('ar-EG')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HospitalDoctorDashboard;
