import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Building2, Star, Phone, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [showDoctors, setShowDoctors] = useState(false);
  
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
      // Load hospital
      const { data: hospitalData, error: hospitalError } = await supabase
        .from("hospitals")
        .select("*")
        .eq("id", hospitalId)
        .single();

      if (hospitalError) throw hospitalError;
      setHospital(hospitalData);

      // Load doctors
      const { data: doctorsData } = await supabase
        .from("hospital_doctors")
        .select("*")
        .eq("hospital_id", hospitalId)
        .eq("is_available", true);

      setDoctors(doctorsData || []);

      // Load reviews
      const { data: reviewsData } = await supabase
        .from("hospital_reviews")
        .select("*, profiles(full_name)")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false })
        .limit(5);

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

    const doctor = doctors.find((d) => d.id === selectedDoctor);
    if (!doctor) return;

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check wallet balance
      if (user) {
        const { data: walletData } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        if (!walletData || walletData.balance < (doctor.consultation_price || 0)) {
          toast.error("رصيد المحفظة غير كافٍ");
          setSubmitting(false);
          return;
        }
      }

      // Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("hospital_bookings")
        .insert({
          hospital_id: hospitalId,
          user_id: user?.id || null,
          doctor_id: selectedDoctor,
          doctor_name: doctor.doctor_name,
          specialization: doctor.specialization,
          patient_name: patientName,
          patient_phone: patientPhone,
          patient_area: patientArea || null,
          price: doctor.consultation_price || 0,
          payment_method: "wallet",
          is_paid: true,
          status: "confirmed",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Deduct from wallet if user is logged in
      if (user) {
        const { data: currentWallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();
          
        if (currentWallet) {
          await supabase
            .from("wallets")
            .update({ balance: currentWallet.balance - (doctor.consultation_price || 0) })
            .eq("user_id", user.id);
        }
      }

      toast.success(
        <div className="space-y-2">
          <p className="font-bold">تم الحجز بنجاح! ✅</p>
          <p className="text-sm">كود الحجز: <span className="font-mono font-bold">{bookingData.id}</span></p>
          <p className="text-sm">قم بإظهار هذا الكود في المستشفى لإتمام الكشف</p>
        </div>,
        { duration: 10000 }
      );

      // Reset form
      setSelectedDoctor("");
      setPatientName("");
      setPatientPhone("");
      setPatientArea("");
      setShowDoctors(false);

    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "خطأ في الحجز");
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "لا توجد تقييمات";

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
        <title>حجز استشارة - {hospital.name} | Cura Verse</title>
        <meta name="description" content={`احجز استشارة طبية في ${hospital.name} مع أفضل الأطباء المتخصصين`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Button
            onClick={() => navigate("/hospital-selection")}
            variant="ghost"
            className="gap-2 hover-scale rounded-2xl"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للمستشفيات
          </Button>

          {/* Hospital Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="shadow-strong rounded-3xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
                <div className="flex gap-4 items-start">
                  {hospital.logo_url ? (
                    <img
                      src={hospital.logo_url}
                      alt={hospital.name}
                      className="w-24 h-24 rounded-2xl object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
                      <Building2 className="w-12 h-12 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-2xl md:text-3xl mb-2">{hospital.name}</CardTitle>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span dir="ltr">{hospital.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span>{hospital.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                        <span className="font-semibold">{averageRating}</span>
                        <span className="text-xs">({reviews.length} تقييم)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-2xl bg-primary/5">
                    <div className="text-2xl font-bold text-primary">{doctors.length}</div>
                    <div className="text-sm text-muted-foreground">أطباء متاحين</div>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-primary/5">
                    <div className="text-2xl font-bold text-primary">{reviews.length}</div>
                    <div className="text-sm text-muted-foreground">تقييم</div>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-primary/5">
                    <div className="text-2xl font-bold text-primary">
                      {hospital.status === "empty" ? "فارغ" :
                       hospital.status === "low_traffic" ? "قليل" :
                       hospital.status === "medium_traffic" ? "متوسط" :
                       hospital.status === "high_traffic" ? "مزدحم" : "جداً"}
                    </div>
                    <div className="text-sm text-muted-foreground">الزحام</div>
                  </div>
                </div>

                {/* Reviews Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">التقييمات</h3>
                  
                  {/* Add Review */}
                  <div className="p-4 rounded-2xl bg-muted/30 space-y-3">
                    <Label>أضف تقييمك</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="اكتب تعليقك (اختياري)"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="rounded-xl"
                    />
                    <Button onClick={handleSubmitReview} className="rounded-xl">
                      إضافة التقييم
                    </Button>
                  </div>

                  {/* Display Reviews */}
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-2xl bg-muted/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? "fill-yellow-500 text-yellow-500"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold">
                            {review.profiles?.full_name || "مستخدم"}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booking Section */}
                <div className="space-y-4">
                  <Button
                    onClick={() => setShowDoctors(!showDoctors)}
                    className="w-full rounded-xl text-lg py-6 gap-2"
                    size="lg"
                  >
                    بدء الحجز
                    {showDoctors ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </Button>

                  <AnimatePresence>
                    {showDoctors && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        {doctors.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            لا يوجد أطباء متاحون حالياً
                          </p>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label>اختر الطبيب *</Label>
                              <div className="grid gap-3">
                                {doctors.map((doctor) => (
                                  <button
                                    key={doctor.id}
                                    onClick={() => setSelectedDoctor(doctor.id)}
                                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                                      selectedDoctor === doctor.id
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50"
                                    }`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-bold">{doctor.doctor_name}</p>
                                        <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                                      </div>
                                      <Badge variant="secondary" className="rounded-lg">
                                        {doctor.consultation_price} جنيه
                                      </Badge>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {selectedDoctor && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4 p-4 rounded-2xl bg-muted/30"
                              >
                                <div className="space-y-2">
                                  <Label htmlFor="name">اسم المريض *</Label>
                                  <Input
                                    id="name"
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                    className="rounded-xl"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="phone">رقم الهاتف *</Label>
                                  <Input
                                    id="phone"
                                    type="tel"
                                    value={patientPhone}
                                    onChange={(e) => setPatientPhone(e.target.value)}
                                    className="rounded-xl"
                                    dir="ltr"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="area">المنطقة</Label>
                                  <Input
                                    id="area"
                                    value={patientArea}
                                    onChange={(e) => setPatientArea(e.target.value)}
                                    className="rounded-xl"
                                  />
                                </div>

                                <div className="p-4 rounded-xl bg-primary/10 space-y-2">
                                  <p className="text-sm font-semibold">ملخص الحجز:</p>
                                  <div className="text-sm space-y-1">
                                    <p>• الطبيب: {doctors.find(d => d.id === selectedDoctor)?.doctor_name}</p>
                                    <p>• التخصص: {doctors.find(d => d.id === selectedDoctor)?.specialization}</p>
                                    <p>• التكلفة: {doctors.find(d => d.id === selectedDoctor)?.consultation_price} جنيه</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    💡 سيتم خصم المبلغ من محفظتك وستحصل على كود الحجز لإظهاره في المستشفى
                                  </p>
                                </div>

                                <Button
                                  onClick={handleBooking}
                                  disabled={submitting}
                                  className="w-full rounded-xl py-6"
                                  size="lg"
                                >
                                  {submitting ? "جاري الحجز..." : "تأكيد الحجز"}
                                </Button>
                              </motion.div>
                            )}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default HospitalBooking;