import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Upload, Wallet as WalletIcon, Copy, Search, Eye, Plus, ArrowUpDown, ArrowUp, MessageSquare, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Wallet = () => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const paymentDetails: any = {
    vodafone: {
      name: "Vodafone Cash",
      icon: "https://cdn0.iconfinder.com/data/icons/circle-icons/512/vodafone.png",
      number: "01108279642",
      note: "افتح تطبيق فودافون كاش أو اطلب كود *9# ثم حوّل المبلغ إلى الرقم الموضح.",
    },
    etisalat: {
      name: "Etisalat Cash",
      icon: "https://images.seeklogo.com/logo-png/45/1/etisalat-logo-png_seeklogo-451518.png",
      number: "0118279642",
      note: "افتح تطبيق اتصالات كاش أو استخدم الكود *777# لتحويل المبلغ للرقم الموضح.",
    },
    telda: {
      name: "Telda",
      icon: "https://cdn.brandfetch.io/idBZNBQYTk/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1757255324312",
      number: "@youssef2413",
      note: "افتح تطبيق Telda ثم أرسل المبلغ إلى الحساب الموضح.",
    },
    instapay: {
      name: "InstaPay",
      icon: "https://upload.wikimedia.org/wikipedia/commons/2/20/InstaPay_Logo.png?20230411102327",
      number: "5484460473322410",
      note: "حوّل المبلغ عبر تطبيق Instapay إلى رقم البطاقة الموضح.\nاسم حامل البطاقة: YOUSSEF ELSAYED",
    },
  };

  useEffect(() => {
    loadWallet();
    loadDepositRequests();
  }, []);

  const loadWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setWallet(data);
    }
  };

  const loadDepositRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setDepositRequests(data || []);
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) {
      toast({
        title: t("auth.error"),
        description: t("wallet.fillAllFields"),
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("id", searchId)
        .single();

      if (error) throw error;

      if (data) {
        setSearchResult(data);
        toast({
          title: t("search.searchResults"),
          description: `${t("wallet.amount")}: ${data.amount} ${t("wallet.points")}`,
        });
      } else {
        toast({
          title: t("search.noResults"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: t("search.noResults"),
        variant: "destructive",
      });
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("wallet.copied"), description: t("wallet.copiedDesc") });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proofImage || !amount || !paymentMethod) {
      toast({
        title: t("auth.error"),
        description: t("wallet.fillAllFields"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const fileExt = proofImage.name.split(".").pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const path = `${user!.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("deposit-proofs")
        .upload(path, proofImage);

      if (uploadError) throw uploadError;

      await supabase.from("deposit_requests").insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        proof_image_url: path,
        status: "pending",
      });

      toast({
        title: t("wallet.requestSent"),
        description: t("wallet.requestSentDesc"),
      });

      setAmount("");
      setPaymentMethod("");
      setProofImage(null);
      setShowDepositForm(false);
      loadDepositRequests();
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
              <WalletIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("wallet.myWallet")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <MessageSquare className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Language Switcher */}
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        {/* Balance Card */}
        <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-8 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-medium text-gray-700">{t("wallet.totalBalance")}</h2>
              <Eye className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-5xl font-bold text-gray-900 mb-8">
              {wallet?.balance?.toFixed(2) || "0.00"} <span className="text-2xl text-gray-600">{t("wallet.points")}</span>
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-4">
              <button 
                onClick={() => setShowDepositForm(!showDepositForm)}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-colors">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium">{t("wallet.buy")}</span>
              </button>

              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-colors">
                  <ArrowUpDown className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium">{t("wallet.swap")}</span>
              </button>

              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-colors">
                  <ArrowUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium">{t("wallet.send")}</span>
              </button>

              <button 
                onClick={() => setShowDepositForm(!showDepositForm)}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-colors">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium">{t("wallet.deposit")}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Search by ID Section */}
        <Card className="border-0 shadow-lg rounded-3xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="w-5 h-5" />
              {t("search.searchById")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder={t("search.searchPlaceholder")}
                className="rounded-2xl border-gray-200 h-12"
              />
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="bg-black hover:bg-gray-800 rounded-2xl px-6"
              >
                {searching ? t("common.loading") : t("search.search")}
              </Button>
            </div>

            {searchResult && (
              <div className="mt-4 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">{t("search.searchResults")}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium">{searchResult.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("wallet.amount")}:</span>
                    <span className="font-medium">{searchResult.amount} {t("wallet.points")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("wallet.paymentMethod")}:</span>
                    <span className="font-medium">{searchResult.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${searchResult.status === 'approved' ? 'text-green-600' : searchResult.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {searchResult.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{new Date(searchResult.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deposit Form - Collapsible */}
        {showDepositForm && (
          <Card className="border-0 shadow-lg rounded-3xl animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-t-3xl">
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="w-5 h-5" />
                {t("wallet.title")}
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium">{t("wallet.amount")}</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                    required
                    className="rounded-2xl border-gray-200 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method" className="text-sm font-medium">{t("wallet.paymentMethod")}</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    required
                  >
                    <SelectTrigger className="rounded-2xl border-gray-200 h-12">
                      <SelectValue placeholder={t("wallet.choosePayment")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                      <SelectItem value="etisalat">Etisalat Cash</SelectItem>
                      <SelectItem value="telda">Telda</SelectItem>
                      <SelectItem value="instapay">InstaPay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod && (
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={paymentDetails[paymentMethod].icon}
                        alt={paymentDetails[paymentMethod].name}
                        className="w-10 h-10 rounded-full"
                      />
                      <h3 className="font-semibold text-gray-900">
                        {paymentDetails[paymentMethod].name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                      <span className="font-mono text-gray-800 font-medium">
                        {paymentDetails[paymentMethod].number}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(paymentDetails[paymentMethod].number)}
                        className="flex items-center gap-1 rounded-xl"
                      >
                        <Copy className="w-4 h-4" /> {t("wallet.copy")}
                      </Button>
                    </div>

                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {paymentDetails[paymentMethod].note}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="proof" className="text-sm font-medium">{t("wallet.proofOfPayment")}</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-purple-300 transition-colors">
                    <Input
                      id="proof"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setProofImage(e.target.files?.[0] || null)
                      }
                      className="hidden"
                      required
                    />
                    <label
                      htmlFor="proof"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {proofImage
                          ? proofImage.name
                          : t("wallet.uploadProof")}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-2xl space-y-2">
                  <h3 className="font-semibold text-sm">{t("wallet.notes")}</h3>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>{t("wallet.note1")}</li>
                    <li>{t("wallet.note2")}</li>
                    <li>{t("wallet.note3")}</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 rounded-full h-14 text-base font-semibold shadow-lg"
                  disabled={loading}
                >
                  {loading ? t("wallet.sending") : t("wallet.submitRequest")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        {depositRequests.length > 0 && (
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {depositRequests.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                        <WalletIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{req.payment_method}</p>
                        <p className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{req.amount} {t("wallet.points")}</p>
                      <p className={`text-xs ${req.status === 'approved' ? 'text-green-600' : req.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {req.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Wallet;
