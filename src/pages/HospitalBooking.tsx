import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Star, Phone, Mail } from "lucide-react";
import { Helmet } from "react-helmet";

const HospitalBooking = () => {
  const [searchParams] = useSearchParams();
  const hospitalId = searchParams.get("hospitalId");
  const navigate = useNavigate();

  const [hospital, setHospital] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientArea, setPatientArea] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    if (hospitalId) {
      loadData();
    } else {
      navigate("/hospital-selection");
    }
  }, [hospitalId, navigate]);

  const loadData = async () => {
    try {
      const { data: hospitalData, error: hospitalError } = await supabase
        .from("hospitals")
        .select("*")
        .eq("id", hospitalId)
        .single();

      if (hospitalError) throw hospitalError;
      setHospital(hospitalData);

      const { data: doctorsData } = await supabase
        .from("hospital_doctors")
        .select("*")
        .eq("hospital_id", hospitalId)
        .eq("is_available", true);

      setDoctors(doctorsData || []);

      const { data: reviewsData } = await supabase
        .from("hospital_reviews")
        .select("*, profiles(full_name)")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false })
        .limit(10);

      setReviews(reviewsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!rating) {
      toast.error("يرجى اختيار التقييم");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      navigate("/auth");
      return;
    }

    try {
      const { error } = await supabase
        .from("hospital_reviews")
        .insert({
          hospital_id: hospitalId,
          user_id: user.id,
          rating,
          comment: reviewComment || null,
        });

      if (error) throw error;

      toast.success("تم إضافة التقييم بنجاح");
      setRating(0);
      setReviewComment("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "خطأ في إضافة التقييم");
    }
  };

  const handleBooking = async () => {
    if (!selectedDoctor || !patientName || !patientPhone) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setSubmitting(true);

    try {
      const doctor = doctors.find((d) => d.id === selectedDoctor);
      
      const { error } = await supabase
        .from("hospital_bookings")
        .insert({
          hospital_id: hospitalId,
          doctor_id: selectedDoctor,
          doctor_name: doctor?.doctor_name,
          specialization: doctor?.specialization,
          patient_name: patientName,
          patient_phone: patientPhone,
          patient_area: patientArea || null,
          price: doctor?.consultation_price || 0,
          status: "pending",
        });

      if (error) throw error;

      toast.success("تم إرسال طلب الحجز بنجاح! سيتم التواصل معك قريباً.");
      setSelectedDoctor("");
      setPatientName("");
      setPatientPhone("");
      setPatientArea("");
    } catch (error: any) {
      toast.error(error.message || "خطأ في الحجز");
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>المستشفى غير موجود</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{hospital?.name || "حجز موعد"} - منصة الرعاية الطبية</title>
        <meta name="description" content={`احجز موعدك في ${hospital?.name || "المستشفى"}. أطباء متخصصون وخدمات طبية متميزة.`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl">
          <Button onClick={() => navigate("/hospital-selection")} variant="ghost" className="mb-4 sm:mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />العودة
          </Button>

          {/* Hospital Info Card */}
          <Card className="rounded-2xl sm:rounded-3xl mb-4 sm:mb-6 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {hospital?.logo_url && (
                  <img src={hospital.logo_url} alt={hospital.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shadow-md" />
                )}
                <div className="flex-1 w-full">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">{hospital?.name}</h1>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span dir="ltr">{hospital?.phone}</span></div>
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{hospital?.email}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge className="text-xs sm:text-sm" variant={hospital?.status === "empty" ? "default" : hospital?.status === "very_crowded" ? "destructive" : "secondary"}>
                      {hospital?.status === "empty" ? "فارغ" : hospital?.status === "low_traffic" ? "ازدحام خفيف" : hospital?.status === "medium_traffic" ? "ازدحام متوسط" : hospital?.status === "high_traffic" ? "ازدحام عالي" : "مزدحم جداً"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm font-semibold">{averageRating}</span>
                      <span className="text-xs text-muted-foreground">({reviews.length})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Booking Form */}
          <Card className="rounded-2xl sm:rounded-3xl mb-4 sm:mb-6">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">احجز موعدك</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-sm sm:text-base">اختر الطبيب</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue placeholder="اختر الطبيب" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id} className="text-sm sm:text-base">
                        د. {doctor.doctor_name} - {doctor.specialization} ({doctor.consultation_price} جنيه)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm sm:text-base">اسم المريض</Label>
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="أدخل اسم المريض" className="text-sm sm:text-base" />
              </div>

              <div>
                <Label className="text-sm sm:text-base">رقم الهاتف</Label>
                <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="أدخل رقم الهاتف" className="text-sm sm:text-base" />
              </div>

              <div>
                <Label className="text-sm sm:text-base">المنطقة (اختياري)</Label>
                <Input value={patientArea} onChange={(e) => setPatientArea(e.target.value)} placeholder="أدخل المنطقة" className="text-sm sm:text-base" />
              </div>

              <Button onClick={handleBooking} disabled={submitting} className="w-full text-sm sm:text-base">
                {submitting ? "جاري الحجز..." : "تأكيد الحجز"}
              </Button>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <Card className="rounded-2xl sm:rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                التقييمات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {reviews.length === 0 ? (
                <p className="text-sm sm:text-base text-muted-foreground text-center py-4">لا توجد تقييمات بعد</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-3 sm:p-4 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 sm:w-4 sm:h-4 ${i < review.rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`} />
                          ))}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold">{review.profiles?.full_name || "مستخدم"}</span>
                      </div>
                      {review.comment && <p className="text-xs sm:text-sm text-muted-foreground">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Review Form */}
              <div className="pt-3 sm:pt-4 border-t space-y-3">
                <Label className="text-sm sm:text-base">أضف تقييمك</Label>
                <div className="flex gap-2 justify-center sm:justify-start">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} type="button" className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                      <Star className={`w-6 h-6 sm:w-8 sm:h-8 ${star <= rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="اكتب تعليقك (اختياري)" className="text-sm sm:text-base" rows={3} />
                <Button onClick={handleSubmitReview} className="w-full text-sm sm:text-base">إضافة التقييم</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default HospitalBooking;
