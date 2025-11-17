import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Users, Calendar, DollarSign, Plus, LogOut, Printer, Edit, Eye, EyeOff } from "lucide-react";

type HospitalStatus = "empty" | "low_traffic" | "medium_traffic" | "high_traffic" | "very_crowded";

const HospitalDashboard = () => {
  const [hospital, setHospital] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [status, setStatus] = useState<HospitalStatus>("medium_traffic");
  const [loading, setLoading] = useState(true);
  
  // Doctor form
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPassword, setDoctorPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [consultationPrice, setConsultationPrice] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadHospitalData();
  }, []);

  const loadHospitalData = async () => {
    try {
      const sessionData = localStorage.getItem("hospitalSession");
      if (!sessionData) {
        navigate("/hospital-auth");
        return;
      }

      const session = JSON.parse(sessionData);
      const { data: hospitalData } = await supabase
        .from("hospitals")
        .select("*")
        .eq("id", session.hospitalId)
        .single();

      if (!hospitalData) {
        navigate("/hospital-auth");
        return;
      }

      setHospital(hospitalData);
      setStatus(hospitalData.status);

      const { data: doctorsData } = await supabase
        .from("hospital_doctors")
        .select("*")
        .eq("hospital_id", hospitalData.id);

      setDoctors(doctorsData || []);

      const { data: bookingsData } = await supabase
        .from("hospital_bookings")
        .select("*")
        .eq("hospital_id", hospitalData.id)
        .order("created_at", { ascending: false });

      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error loading hospital data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hospitalSession");
    navigate("/hospital-auth");
  };

  const printBookingReceipt = (booking: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>وصل حجز - ${booking.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; background: #f5f5f5; }
          .receipt { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { width: 100px; height: 100px; margin: 0 auto 15px; border-radius: 12px; object-fit: cover; }
          h1 { font-size: 28px; color: #1f2937; margin-bottom: 8px; }
          .booking-code { text-align: center; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; color: white; }
          .booking-code-value { font-size: 32px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 2px; }
          .info-section { margin: 25px 0; padding: 20px; background: #f9fafb; border-radius: 8px; }
          .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #6b7280; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px dashed #e5e7eb; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            ${hospital?.logo_url ? `<img src="${hospital.logo_url}" alt="Logo" class="logo" />` : ''}
            <h1>${hospital?.name || "المستشفى"}</h1>
          </div>
          <div class="booking-code">
            <div class="booking-code-value">${booking.id}</div>
          </div>
          <div class="info-section">
            <div class="info-row"><span class="label">اسم المريض:</span><span class="value">${booking.patient_name}</span></div>
            <div class="info-row"><span class="label">رقم الهاتف:</span><span class="value">${booking.patient_phone}</span></div>
            ${booking.patient_area ? `<div class="info-row"><span class="label">المنطقة:</span><span class="value">${booking.patient_area}</span></div>` : ''}
            <div class="info-row"><span class="label">الطبيب:</span><span class="value">${booking.doctor_name || "غير محدد"}</span></div>
            <div class="info-row"><span class="label">التخصص:</span><span class="value">${booking.specialization || "غير محدد"}</span></div>
            <div class="info-row"><span class="label">التكلفة:</span><span class="value">${booking.price} جنيه</span></div>
          </div>
          <div class="footer">
            <p>شكراً لاختياركم ${hospital?.name || "مستشفانا"}</p>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>`;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  const addDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("hospital_doctors").insert({
        hospital_id: hospital.id,
        doctor_name: doctorName,
        doctor_email: doctorEmail,
        doctor_password: doctorPassword,
        specialization,
        consultation_price: parseFloat(consultationPrice) || 0,
        is_available: true,
      });

      if (error) throw error;
      toast.success("تم إضافة الطبيب بنجاح");
      loadHospitalData();
      setDoctorName("");
      setDoctorEmail("");
      setDoctorPassword("");
      setSpecialization("");
      setConsultationPrice("");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleDoctorAvailability = async (doctorId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("hospital_doctors")
        .update({ is_available: !currentStatus })
        .eq("id", doctorId);

      if (error) throw error;
      toast.success("تم تحديث حالة الطبيب");
      loadHospitalData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">لوحة التحكم - {hospital?.name}</h1>
            <p className="text-muted-foreground">إدارة المستشفى والحجوزات</p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2"><LogOut className="w-4 h-4" />تسجيل الخروج</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl"><CardContent className="p-6"><Users className="w-8 h-8 text-primary mb-2" /><p className="text-2xl font-bold">{doctors.length}</p><p className="text-sm text-muted-foreground">الأطباء</p></CardContent></Card>
          <Card className="rounded-2xl"><CardContent className="p-6"><Calendar className="w-8 h-8 text-primary mb-2" /><p className="text-2xl font-bold">{bookings.length}</p><p className="text-sm text-muted-foreground">إجمالي الحجوزات</p></CardContent></Card>
        </div>

        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList><TabsTrigger value="bookings">الحجوزات</TabsTrigger><TabsTrigger value="doctors">الأطباء</TabsTrigger></TabsList>

          <TabsContent value="bookings" className="space-y-4">
            <Card className="rounded-3xl"><CardHeader><CardTitle>الحجوزات الأخيرة</CardTitle></CardHeader><CardContent className="grid gap-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-4 rounded-2xl bg-card border space-y-2">
                  <div className="flex justify-between"><div><p className="font-semibold">{booking.patient_name}</p><p className="text-sm text-muted-foreground">{booking.patient_phone}</p></div><Badge>{booking.status === "confirmed" ? "مؤكد" : booking.status}</Badge></div>
                  <div className="text-sm"><p>كود: <span className="font-mono font-bold">{booking.id}</span></p><p>الطبيب: {booking.doctor_name}</p><p>السعر: {booking.price} جنيه</p></div>
                  <Button onClick={() => printBookingReceipt(booking)} variant="outline" size="sm" className="w-full gap-2"><Printer className="w-4 h-4" />طباعة الوصل</Button>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="doctors" className="space-y-4">
            <Card className="rounded-3xl"><CardHeader><CardTitle>إضافة طبيب جديد</CardTitle></CardHeader><CardContent><form onSubmit={addDoctor} className="space-y-4">
              <div><Label>اسم الطبيب</Label><Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} required /></div>
              <div><Label>البريد الإلكتروني</Label><Input type="email" value={doctorEmail} onChange={(e) => setDoctorEmail(e.target.value)} required /></div>
              <div><Label>كلمة المرور</Label><Input type="password" value={doctorPassword} onChange={(e) => setDoctorPassword(e.target.value)} required /></div>
              <div><Label>التخصص</Label><Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} required /></div>
              <div><Label>سعر الكشف</Label><Input type="number" value={consultationPrice} onChange={(e) => setConsultationPrice(e.target.value)} required /></div>
              <Button type="submit" className="w-full"><Plus className="w-4 h-4 ml-2" />إضافة الطبيب</Button>
            </form></CardContent></Card>

            <Card className="rounded-3xl"><CardHeader><CardTitle>قائمة الأطباء</CardTitle></CardHeader><CardContent className="space-y-3">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="p-4 rounded-2xl bg-card border flex justify-between items-center">
                  <div><p className="font-semibold">{doctor.doctor_name}</p><p className="text-sm text-muted-foreground">{doctor.specialization}</p></div>
                  <Button onClick={() => toggleDoctorAvailability(doctor.id, doctor.is_available)} variant={doctor.is_available ? "default" : "outline"} size="sm">{doctor.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</Button>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HospitalDashboard;