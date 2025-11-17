import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, Bell, User, Eye, EyeOff, Plus, ArrowRightLeft, History } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
// no alerts in wallet after moving deposit page

const Wallet = () => {
  // Deposit state handled in Deposit page
  const [wallet, setWallet] = useState<any>(null);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]); // kept for potential future use
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [doctor, setDoctor] = useState<any>(null);
  // const [showDeposit, setShowDeposit] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [hospitalBookings, setHospitalBookings] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const historyRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  // deposit payment details moved to Deposit page

  useEffect(() => {
    loadWallet();
    loadContextAndHistory();
    loadDepositRequests();
  }, []);

  const loadWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setWallet(data);
    }
  };

  const loadContextAndHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Detect if user is a doctor and get doctor id
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    setDoctor(doctorData);

    // Load recent transactions (RLS will restrict to user-related only)
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, profiles(full_name, avatar_url), doctors(doctor_name, image_url)')
      .order('created_at', { ascending: false })
      .limit(10);
    setTransactions(txData || []);

    // Load recent consultations for the user
    const { data: consData } = await supabase
      .from('consultations')
      .select('*, doctors(doctor_name, image_url, specialization_ar, profiles(avatar_url))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setConsultations(consData || []);

    // Load recent hospital bookings for the user
    const { data: bookingData } = await supabase
      .from('hospital_bookings')
      .select('*, hospitals(name, logo_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setHospitalBookings(bookingData || []);

    // Load withdraw requests if doctor
    if (doctorData?.id) {
      const { data: wdData } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setWithdrawRequests(wdData || []);
    } else {
      setWithdrawRequests([]);
    }
  };

  const loadDepositRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setDepositRequests(data || []);
  };

  // moved to Deposit page

  // moved to Deposit page

  const handleDepositClick = () => {
    navigate('/deposit');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-pink-50 to-white p-4 pb-24">
      <div className="container mx-auto max-w-2xl">
        {/* Header: greeting, profile icon (right) and notifications (left) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-6 flex items-center justify-between"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">مرحباً،</p>
              <p className="text-sm font-semibold">{profile?.full_name || 'عزيزي المستخدم'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* Balance Circle + Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Card className="shadow-strong rounded-3xl border-0 mb-6 bg-white/80 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">{t('wallet.accountBalance')}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBalance(!showBalance)}>
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-28 h-28">
                <div className="w-28 h-28 rounded-full border-8 border-primary/20 flex items-center justify-center animate-pulse-glow">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{showBalance ? (wallet?.balance?.toFixed(0) || '0') : '•••••'}</div>
                    <div className="text-xs text-muted-foreground">{t('common.points')}</div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(var(--primary) 360deg, transparent 0)' }} />
              </div>
              {/* Action buttons - three in a row */}
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center">
                  <Button onClick={handleDepositClick} className="rounded-full h-12 w-12 flex items-center justify-center shadow-medium bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white">
                    <Plus className="w-5 h-5" />
                  </Button>
                  <span className="text-xs mt-2">{t('common.deposit')}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Button onClick={() => navigate('/transfer')} variant="outline" className="rounded-full h-12 w-12 flex items-center justify-center bg-white">
                    <ArrowRightLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-xs mt-2">{t('common.transfer')}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Button onClick={() => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} variant="secondary" className="rounded-full h-12 w-12 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </Button>
                  <span className="text-xs mt-2">{t('common.history')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* سجل موحد للاستشارات والإيداعات */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} ref={historyRef}>
        <Card className="shadow-medium rounded-3xl border-0 mt-6 bg-white/85 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('wallet.latest')}
            </CardTitle>
            <CardDescription>{t('wallet.recent')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                ...consultations.map((c: any) => ({
                  kind: 'consultation' as const,
                  id: c.id,
                  created_at: c.created_at,
                  amount: c.price,
                  doctor: c.doctors,
                })),
                ...depositRequests.map((d: any) => ({
                  kind: 'deposit' as const,
                  id: d.id,
                  created_at: d.created_at,
                  amount: d.amount,
                  status: d.status,
                })),
                ...hospitalBookings.map((b: any) => ({
                  kind: 'hospital' as const,
                  id: b.id,
                  created_at: b.created_at,
                  amount: b.price,
                  hospital: b.hospitals,
                })),
              ]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((item, idx) => (
                  <motion.div
                    key={`${item.kind}-${item.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center gap-3 p-3 bg-secondary rounded-xl"
                  >
                    {item.kind === 'consultation' ? (
                      <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                        <AvatarImage src={item.doctor?.image_url || item.doctor?.profiles?.avatar_url || '/placeholder.svg'} alt={item.doctor?.doctor_name || 'دكتور'} className="object-cover" />
                        <AvatarFallback>{item.doctor?.doctor_name?.charAt(0) || 'د'}</AvatarFallback>
                      </Avatar>
                    ) : item.kind === 'hospital' ? (
                      <Avatar className="w-10 h-10 ring-2 ring-blue-500/20">
                        <AvatarImage src={item.hospital?.logo_url || '/placeholder.svg'} alt={item.hospital?.name || 'مستشفى'} className="object-cover" />
                        <AvatarFallback>{item.hospital?.name?.charAt(0) || 'م'}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">+
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {item.kind === 'consultation'
                            ? item.doctor?.doctor_name
                            : item.kind === 'hospital'
                            ? item.hospital?.name
                            : 'إيداع'}
                        </p>
                        {item.kind === 'deposit' && (
                          <Badge variant={item.status === 'approved' ? 'default' : item.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {item.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString('ar-EG')} • ID: {item.id}
                      </p>
                    </div>
                    <div className="text-primary font-bold">
                      {Number(item.amount).toFixed(0)} نقطة
                    </div>
                  </motion.div>
                ))}
              {consultations.length === 0 && depositRequests.length === 0 && hospitalBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-6">لا يوجد سجل بعد</p>
              )}
            </div>
          </CardContent>
        </Card>
        </motion.div>

        
      </div>
      <BottomNav />
    </div>
  );

  function renderTxItem(t: any) {
    const amount = Number(t.amount);
    let sign = '-';
    let color = 'text-destructive';
    if (t.type === 'transfer' && t.receiver_id === wallet?.user_id) { sign = '+'; color = 'text-green-600'; }
    if (t.type === 'consultation' && doctor && t.doctor_id === doctor.id) { sign = '+'; color = 'text-green-600'; }
    return (
      <div key={t.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{t.type === 'consultation' ? 'استشارة' : t.type === 'transfer' ? 'تحويل' : t.type}</p>
          <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString('ar-EG')} • ID: {t.id}</p>
        </div>
        <div className={`text-lg font-bold ${color}`}>
          {sign}{amount.toFixed(0)} نقطة
        </div>
      </div>
    );
  }
};

export default Wallet;
