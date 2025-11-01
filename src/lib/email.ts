import { supabase } from "@/integrations/supabase/client";

type EmailPayload = {
  type:
    | "welcome"
    | "deposit_received"
    | "deposit_approved"
    | "deposit_rejected"
    | "withdraw_received"
    | "withdraw_approved"
    | "withdraw_rejected"
    | "doctor_request_received"
    | "doctor_request_approved"
    | "doctor_request_rejected"
    | "transfer_sent"
    | "transfer_received"
    | "custom";
  to: string;
  data: Record<string, unknown>;
};

export async function sendTransactionalEmail(payload: EmailPayload) {
  if (!payload.to) {
    throw new Error("Missing recipient email address");
  }

  const { data, error } = await supabase.functions.invoke("send-email", {
    body: payload,
  });

  if (error) {
    console.error("Failed to send email via edge function", error);
    throw new Error(error.message || "??? ????? ?????? ??????????");
  }

  return data;
}
