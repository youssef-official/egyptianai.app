-- Add call status/type to chat sessions and RPCs for call flow

ALTER TABLE public.chat_sessions 
  ADD COLUMN IF NOT EXISTS call_status text NOT NULL DEFAULT 'none' CHECK (call_status IN ('none','requested','accepted','rejected')),
  ADD COLUMN IF NOT EXISTS call_type text CHECK (call_type IN ('audio','video'));

-- User requests a call (audio/video)
CREATE OR REPLACE FUNCTION public.user_request_call(_session_id text, _call_type text)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _u uuid := auth.uid();
  _doc_id uuid;
  _is_online boolean;
  _status text;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _call_type NOT IN ('audio','video') THEN RAISE EXCEPTION 'Invalid call type'; END IF;

  SELECT s.doctor_id, d.is_online, s.status
  INTO _doc_id, _is_online, _status
  FROM public.chat_sessions s
  JOIN public.doctors d ON d.id = s.doctor_id
  WHERE s.id = _session_id AND s.user_id = _u;

  IF _doc_id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF NOT _is_online THEN RAISE EXCEPTION 'Doctor offline'; END IF;
  IF _status <> 'active' THEN RAISE EXCEPTION 'Session not active'; END IF;

  UPDATE public.chat_sessions
  SET call_status = 'requested', call_type = _call_type
  WHERE id = _session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.user_request_call(text, text) TO authenticated;

-- Doctor responds to a call request
CREATE OR REPLACE FUNCTION public.doctor_respond_call(_session_id text, _accept boolean)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _doc_id uuid;
BEGIN
  SELECT id INTO _doc_id FROM public.doctors WHERE user_id = auth.uid();
  IF _doc_id IS NULL THEN RAISE EXCEPTION 'Not a doctor'; END IF;

  -- Ensure session belongs to doctor and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_sessions WHERE id = _session_id AND doctor_id = _doc_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  UPDATE public.chat_sessions
  SET call_status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END
  WHERE id = _session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.doctor_respond_call(text, boolean) TO authenticated;
