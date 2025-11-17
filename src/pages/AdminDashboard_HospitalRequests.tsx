import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const HospitalRequestsTab = ({ 
  requests, 
  adminNotes, 
  setAdminNotes, 
  onUpdate 
}: { 
  requests: any[], 
  adminNotes: any, 
  setAdminNotes: any, 
  onUpdate: () => void 
}) => {
  const { toast } = useToast();

  // This function now calls the corrected 'approve_hospital_request' stored procedure.
  // The procedure handles both approving and rejecting requests.
  // When a request is approved, it now correctly creates a new hospital record.
  const handle_hospital_request = async (req: any, is_approved: boolean) => {
    try {
      const { error } = await (supabase as any).rpc('approve_hospital_request', {
        _request_id: req.id,
        _approve: is_approved,
        _notes: adminNotes[req.id] || null,
      });
      if (error) throw error;
      toast({ title: is_approved ? "تم قبول المستشفى بنجاح" : "تم رفض الطلب" });
      onUpdate();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  return (
    <>
      {requests.map((req) => (
        <Card key={req.id} className="rounded-3xl border-0 shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{req.hospital_name}</span>
              <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                {req.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {req.phone} • {req.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="rounded-xl w-full"
              size="sm"
              onClick={async () => {
                try {
                  const raw = String(req.ownership_docs_url || '').trim();
                  // If a full URL was stored, extract the pathname; otherwise keep as-is
                  let path = raw;
                  try {
                    const u = new URL(raw);
                    path = u.pathname;
                  } catch {}

                  // Normalize common storage prefixes and leading slashes
                  const objectPath = path
                    .replace(/^\/?storage\/v1\/object\/public\/hospital-documents\//, '')
                    .replace(/^\/?storage\/v1\/object\/sign\/hospital-documents\/[^/]+\/?/, '')
                    .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/hospital-documents\//, '')
                    .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/sign\/hospital-documents\/[^/]+\/?/, '')
                    .replace(/^\/?hospital-documents\//, '')
                    .replace(/^\/+/, '');

                  if (!objectPath || !objectPath.includes('/')) {
                    throw new Error('مسار الملف غير صالح');
                  }

                  const { data, error } = await supabase
                    .storage
                    .from('hospital-documents')
                    .createSignedUrl(objectPath, 300);
                  if (error) throw error;
                  if (data?.signedUrl) {
                    window.open(data.signedUrl, '_blank', 'noopener');
                  }
                } catch (e) {
                  toast({ title: 'خطأ', description: 'تعذر فتح المستند', variant: 'destructive' });
                }
              }}
            >
              <Eye className="w-4 h-4 ml-2" />
              عرض مستندات الملكية
            </Button>
            {req.status === 'pending' && (
              <>
                <Textarea
                  placeholder="ملاحظات..."
                  value={adminNotes[req.id] || ''}
                  onChange={(e) => setAdminNotes({ ...adminNotes, [req.id]: e.target.value })}
                  className="rounded-2xl text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={() => handle_hospital_request(req, true)} className="flex-1 bg-green-600 hover:bg-green-700 rounded-full" size="sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    قبول
                  </Button>
                  <Button onClick={() => handle_hospital_request(req, false)} variant="destructive" className="flex-1 rounded-full" size="sm">
                    <XCircle className="w-4 h-4 mr-2" />
                    رفض
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
      {requests.length === 0 && (
        <Card className="rounded-3xl border-0 shadow-medium">
          <CardContent className="py-8 text-center text-muted-foreground">
            لا توجد طلبات مستشفيات
          </CardContent>
        </Card>
      )}
    </>
  );
};
