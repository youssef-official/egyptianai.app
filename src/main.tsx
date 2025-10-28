import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { supabase } from "@/integrations/supabase/client";
import "./index.css";

async function setPresenceOnline() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Best-effort: if user is a doctor, set online
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (prof?.user_type === 'doctor') {
      await supabase.rpc('doctor_set_online', { _is_online: true });
      window.addEventListener('beforeunload', () => {
        supabase.rpc('doctor_set_online', { _is_online: false });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          supabase.rpc('doctor_set_online', { _is_online: false });
        } else {
          supabase.rpc('doctor_set_online', { _is_online: true });
        }
      });
    }
  } catch {}
}

setPresenceOnline();

createRoot(document.getElementById("root")!).render(<App />);
