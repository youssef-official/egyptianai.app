import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie, X } from "lucide-react";

const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowConsent(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookieConsent", "declined");
    setShowConsent(false);
  };

  return (
    <AnimatePresence>
      {showConsent && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <Card className="max-w-4xl mx-auto shadow-2xl border-0 bg-card/95 backdrop-blur-lg">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">سياسة الخصوصية والكوكيز</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDecline}
                  className="rounded-full hover-scale"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="text-base leading-relaxed">
                نحن نستخدم ملفات تعريف الارتباط (الكوكيز) لتحسين تجربتك على موقعنا، وتقديم محتوى مخصص، وتحليل حركة المرور على الموقع. 
                باستخدامك لهذا الموقع، فإنك توافق على استخدامنا لملفات تعريف الارتباط وفقاً لـ
                <a href="/privacy.html" target="_blank" className="text-primary hover:underline mx-1">
                  سياسة الخصوصية
                </a>
                و
                <a href="/terms.html" target="_blank" className="text-primary hover:underline mx-1">
                  شروط الاستخدام
                </a>
                الخاصة بنا.
              </CardDescription>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAccept}
                  className="flex-1 h-12 rounded-2xl hover-lift text-base"
                >
                  قبول جميع الكوكيز
                </Button>
                <Button
                  onClick={handleDecline}
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl hover-scale text-base"
                >
                  رفض الكوكيز غير الضرورية
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
