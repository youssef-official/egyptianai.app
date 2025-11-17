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
import { Users, Calendar, Plus, LogOut, Printer, Eye, EyeOff } from "lucide-react";

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

  // Booking form
  const [bookingType, setBookingType] = useState<"online" | "offline">("online");
  const [onlineBookingId, setOnlineBookingId] = useState("");
  const [onlineBookingData, setOnlineBookingData] = useState<any>(null);

  const [offlinePatientName, setOfflinePatientName] = useState("");
  const [offlinePatientPhone, setOfflinePatientPhone] = useState("");
  const [offlinePatientArea, setOfflinePatientArea] = useState("");
  const [offlineDoctor, setOfflineDoctor] = useState("");
  const [offlinePrice, setOfflinePrice] = useState("");

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

  // ⭐ جلب بيانات الحجز بمجرد كتابة ID
  const fetchOnlineBooking = async (bookingId: string) => {
    if (!bookingId.trim()) {
      setOnlineBookingData(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("hospital_bookings")
        .select("*")
        .eq("id", bookingId.trim())
        .eq("hospital_id", hospital?.id)
        .single();

      if (error || !data) {
        setOnlineBookingData(null);
        return;
      }

      setOnlineBookingData(data);
    } catch (err) {
      console.log(err);
    }
  };

  // ⭐ تأكيد الحجز أونلاين + منع التكرار
  const handleOnlineBooking = async () => {
    if (!onlineBookingId.trim()) {
      toast.error("يرجى إدخال معرف الحجز");
      return;
    }

    try {
      const { data: booking, error } = await supabase
        .from("hospital_bookings")
        .select("*")
        .eq("id", onlineBookingId.trim())
        .eq("hospital_id", hospital.id)
        .single();

      if (error || !booking) {
        toast.error("لم يتم العثور على الحجز");
        return;
      }

      // ❌ لو Confirmed → لا تعيده تاني
      if (booking.status === "confirmed") {
        toast.error("هذا الحجز تم استخدامه مسبقًا");
        return;
      }

      // ✔️ تحويله إلى confirmed
      const { error: updateError } = await supabase
        .from("hospital_bookings")
        .update({ status: "confirmed", is_paid: true })
        .eq("id", onlineBookingId.trim());

      if (updateError) throw updateError;

      toast.success("تم تأكيد الحجز بنجاح");

      setOnlineBookingId("");
      setOnlineBookingData(null);
      loadHospitalData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  // ====== الجزء الثاني - الواجهة والـ JSX ======

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">لوحة التحكم - {hospital?.name}</h1>
            <p className="text-muted-foreground">إدارة المستشفى والحجوزات</p>
          </div>

          <div className="flex items-center gap-3">
            {/* يمكن إضافة badge يعرض الحالة الحالية هنا */}
            <div>
              <Badge variant="outline" className="capitalize">
                {status?.replace("_", " ") || "غير معروف"}
              </Badge>
            </div>

            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <Users className="w-8 h-8 text-primary mb-2" />
              <p className="text-2xl font-bold">{doctors.length}</p>
              <p className="text-sm text-muted-foreground">الأطباء</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <Calendar className="w-8 h-8 text-primary mb-2" />
              <p className="text-2xl font-bold">{bookings.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
            </CardContent>
          </Card>

          {/* ممكن تضيف كروت حالة إضافية هنا */}
        </div>

        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
            <TabsTrigger value="add-booking">إضافة حجز</TabsTrigger>
            <TabsTrigger value="doctors">الأطباء</TabsTrigger>
            <TabsTrigger value="status">الحالة</TabsTrigger>
          </TabsList>

          {/* ------------------ الحجوزات ------------------ */}
          <TabsContent value="bookings" className="space-y-4">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>آخر الحجوزات</CardTitle>
              </CardHeader>

              <CardContent className="grid gap-4">
                {bookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد حجوزات بعد</p>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className="p-4 rounded-2xl bg-card border space-y-2">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">{booking.patient_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.patient_phone}</p>
                        </div>

                        <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                          {booking.status === "confirmed" ? "مؤكد" : "معلق"}
                        </Badge>
                      </div>

                      <div className="text-sm">
                        <p>كود: <span className="font-mono font-bold">{booking.id}</span></p>
                        <p>الطبيب: {booking.doctor_name}</p>
                        <p>السعر: {booking.price} جنيه</p>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={() => printBookingReceipt(booking)} variant="outline" size="sm" className="flex-1 gap-2">
                          <Printer className="w-4 h-4" /> طباعة الوصل
                        </Button>
                        {/* ممكن تضيف أزرار للتعديل/حذف هنا */}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------ إضافة حجز ------------------ */}
          <TabsContent value="add-booking" className="space-y-4">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>إضافة حجز جديد</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setBookingType("online")}
                    variant={bookingType === "online" ? "default" : "outline"}
                    className="flex-1"
                  >
                    حجز أونلاين
                  </Button>

                  <Button
                    onClick={() => setBookingType("offline")}
                    variant={bookingType === "offline" ? "default" : "outline"}
                    className="flex-1"
                  >
                    حجز أوفلاين
                  </Button>
                </div>

                {bookingType === "online" ? (
                  <div className="space-y-4">
                    {/* Input + Fetch */}
                    <div>
                      <Label>معرف الحجز</Label>
                      <Input
                        value={onlineBookingId}
                        onChange={(e) => {
                          setOnlineBookingId(e.target.value);
                          fetchOnlineBooking(e.target.value);
                        }}
                        placeholder="أدخل معرف الحجز"
                      />
                    </div>

                    {/* عرض بيانات الحجز — أحمر لو pending، أخضر لو confirmed */}
                    {onlineBookingData ? (
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          onlineBookingData.status === "pending"
                            ? "bg-red-100 border-red-400 text-red-700"
                            : "bg-green-100 border-green-400 text-green-700"
                        }`}
                      >
                        <p><strong>الاسم:</strong> {onlineBookingData.patient_name}</p>
                        <p><strong>الهاتف:</strong> {onlineBookingData.patient_phone}</p>

                        {onlineBookingData.patient_area && (
                          <p><strong>المنطقة:</strong> {onlineBookingData.patient_area}</p>
                        )}

                        <p><strong>الطبيب:</strong> {onlineBookingData.doctor_name || "—"}</p>
                        <p><strong>التخصص:</strong> {onlineBookingData.specialization || "—"}</p>
                        <p><strong>السعر:</strong> {onlineBookingData.price} جنيه</p>

                        <p>
                          <strong>الحالة:</strong>{" "}
                          {onlineBookingData.status === "pending"
                            ? "في انتظار التأكيد"
                            : "تم التأكيد"}
                        </p>
                      </div>
                    ) : (
                      // لو مافيش بيانات، نعرض رسالة صغيرة
                      onlineBookingId.trim() ? (
                        <p className="text-sm text-muted-foreground">لم يتم العثور على الحجز بهذا المعرف</p>
                      ) : null
                    )}

                    <Button
                      onClick={handleOnlineBooking}
                      disabled={!onlineBookingId.trim()}
                      className="w-full"
                    >
                      تأكيد الحجز
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>اسم المريض</Label>
                      <Input
                        value={offlinePatientName}
                        onChange={(e) => setOfflinePatientName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label>رقم الهاتف</Label>
                      <Input
                        value={offlinePatientPhone}
                        onChange={(e) => setOfflinePatientPhone(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label>المنطقة</Label>
                      <Input
                        value={offlinePatientArea}
                        onChange={(e) => setOfflinePatientArea(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>الطبيب</Label>
                      <Select value={offlineDoctor} onValueChange={setOfflineDoctor}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الطبيب" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              {doc.doctor_name} - {doc.specialization}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>السعر</Label>
                      <Input
                        type="number"
                        value={offlinePrice}
                        onChange={(e) => setOfflinePrice(e.target.value)}
                        required
                      />
                    </div>

                    <Button onClick={handleOfflineBooking} className="w-full">
                      إضافة الحجز
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------ الأطباء ------------------ */}
          <TabsContent value="doctors" className="space-y-4">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>إضافة طبيب جديد</CardTitle>
              </CardHeader>

              <CardContent>
                <form onSubmit={async (e) => {
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
                    setDoctorName("");
                    setDoctorEmail("");
                    setDoctorPassword("");
                    setSpecialization("");
                    setConsultationPrice("");
                    loadHospitalData();
                  } catch (err: any) {
                    toast.error(err.message || "حدث خطأ");
                  }
                }} className="space-y-4">
                  <div>
                    <Label>اسم الطبيب</Label>
                    <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} required />
                  </div>

                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" value={doctorEmail} onChange={(e) => setDoctorEmail(e.target.value)} required />
                  </div>

                  <div>
                    <Label>كلمة المرور</Label>
                    <Input type="password" value={doctorPassword} onChange={(e) => setDoctorPassword(e.target.value)} required />
                  </div>

                  <div>
                    <Label>التخصص</Label>
                    <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} required />
                  </div>

                  <div>
                    <Label>سعر الكشف</Label>
                    <Input type="number" value={consultationPrice} onChange={(e) => setConsultationPrice(e.target.value)} required />
                  </div>

                  <Button type="submit" className="w-full"><Plus className="w-4 h-4 ml-2" /> إضافة الطبيب</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>قائمة الأطباء</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="p-4 rounded-2xl bg-card border flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{doctor.doctor_name}</p>
                      <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                    </div>

                    <Button onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from("hospital_doctors")
                          .update({ is_available: !doctor.is_available })
                          .eq("id", doctor.id);

                        if (error) throw error;
                        toast.success("تم تحديث حالة الطبيب");
                        loadHospitalData();
                      } catch (err: any) {
                        toast.error(err.message || "حدث خطأ");
                      }
                    }} variant={doctor.is_available ? "default" : "outline"} size="sm">
                      {doctor.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------ الحالة (Status) ------------------ */}
          <TabsContent value="status" className="space-y-4">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>حالة المستشفى</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <Label>اختر الحالة الحالية</Label>

                <Select
                  value={status}
                  onValueChange={async (value: HospitalStatus) => {
                    try {
                      setStatus(value);
                      const { error } = await supabase
                        .from("hospitals")
                        .update({ status: value })
                        .eq("id", hospital.id);

                      if (error) throw error;
                      toast.success("تم تحديث الحالة بنجاح");
                      loadHospitalData();
                    } catch (err) {
                      toast.error("حدث خطأ أثناء تحديث الحالة");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حالة المستشفى" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="empty">فارغ</SelectItem>
                    <SelectItem value="low_traffic">ازدحام منخفض</SelectItem>
                    <SelectItem value="medium_traffic">ازدحام متوسط</SelectItem>
                    <SelectItem value="high_traffic">ازدحام عالي</SelectItem>
                    <SelectItem value="very_crowded">مزدحم جداً</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HospitalDashboard;
