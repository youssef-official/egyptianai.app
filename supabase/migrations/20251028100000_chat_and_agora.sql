-- Chat and availability schema for Agora-powered consultations

-- Doctor availability/status columns
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_busy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_session_id text;

-- Chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id text PRIMARY KEY,
  consultation_id text REFERENCES public.consultations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued','active','ended','closed')) DEFAULT 'queued',
  queue_position integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Participants can view their sessions; admins too
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'chat_sessions' AND policyname = 'Participants can view sessions'
  ) THEN
    CREATE POLICY "Participants can view sessions"
    ON public.chat_sessions FOR SELECT
    USING (
      user_id = auth.uid() OR 
      doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()) OR 
      has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id bigserial PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','doctor','system')),
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','audio','video','system')),
  content text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Participants can read/write messages in their session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Participants can read messages'
  ) THEN
    CREATE POLICY "Participants can read messages"
    ON public.chat_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.chat_sessions s
        WHERE s.id = session_id AND (
          s.user_id = auth.uid() OR 
          s.doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()) OR 
          has_role(auth.uid(), 'admin')
        )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Participants can insert messages'
  ) THEN
    CREATE POLICY "Participants can insert messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.chat_sessions s
        WHERE s.id = session_id AND (
          s.user_id = auth.uid() OR 
          s.doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
        )
      )
    );
  END IF;
END $$;

-- Storage bucket for chat uploads (images/audio)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Public read, authenticated write policy for chat-uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read chat uploads'
  ) THEN
    CREATE POLICY "Public read chat uploads"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-uploads');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can upload chat files'
  ) THEN
    CREATE POLICY "Authenticated can upload chat files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'chat-uploads' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Helper: generate id with prefix
CREATE OR REPLACE FUNCTION public.generate_chat_id()
RETURNS text LANGUAGE SQL AS $$
  SELECT 'CH' || (extract(epoch FROM now())::bigint)::text || lpad((floor(random()*1000))::int::text, 3, '0')
$$;

-- RPC: user requests a chat with a doctor after payment
CREATE OR REPLACE FUNCTION public.request_chat(_doctor_id uuid, _consultation_id text)
RETURNS TABLE(session_id text, position integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _sid text;
  _pos integer := 0;
  _doc_user uuid;
  _is_online boolean;
  _is_busy boolean;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- verify consultation belongs to user and matches doctor
  IF NOT EXISTS (
    SELECT 1 FROM public.consultations c WHERE c.id = _consultation_id AND c.user_id = _user_id AND c.doctor_id = _doctor_id AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid consultation';
  END IF;

  SELECT user_id, is_online, is_busy INTO _doc_user, _is_online, _is_busy FROM public.doctors WHERE id = _doctor_id;
  IF _doc_user IS NULL THEN RAISE EXCEPTION 'Doctor not found'; END IF;
  IF NOT _is_online THEN RETURN QUERY SELECT NULL::text, NULL::int, 'offline'::text; RETURN; END IF;

  _sid := public.generate_chat_id();

  IF _is_busy THEN
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO _pos FROM public.chat_sessions WHERE doctor_id = _doctor_id AND status = 'queued';
    INSERT INTO public.chat_sessions(id, consultation_id, user_id, doctor_id, status, queue_position)
    VALUES (_sid, _consultation_id, _user_id, _doctor_id, 'queued', _pos);
    RETURN QUERY SELECT _sid, _pos, 'queued'::text;
  ELSE
    INSERT INTO public.chat_sessions(id, consultation_id, user_id, doctor_id, status, started_at)
    VALUES (_sid, _consultation_id, _user_id, _doctor_id, 'active', now());
    UPDATE public.doctors SET is_busy = true, current_session_id = _sid WHERE id = _doctor_id;
    RETURN QUERY SELECT _sid, 0, 'active'::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_chat(uuid, text) TO anon, authenticated;

-- RPC: doctor toggles online state
CREATE OR REPLACE FUNCTION public.doctor_set_online(_is_online boolean)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _doc_id uuid;
BEGIN
  SELECT id INTO _doc_id FROM public.doctors WHERE user_id = auth.uid();
  IF _doc_id IS NULL THEN RAISE EXCEPTION 'Not a doctor'; END IF;

  UPDATE public.doctors 
  SET is_online = _is_online,
      is_busy = CASE WHEN _is_online THEN is_busy ELSE false END,
      current_session_id = CASE WHEN _is_online THEN current_session_id ELSE NULL END
  WHERE id = _doc_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.doctor_set_online(boolean) TO authenticated;

-- RPC: doctor ends current session and auto-takes next if exists
CREATE OR REPLACE FUNCTION public.doctor_end_session()
RETURNS TABLE(new_session_id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _doc_id uuid;
  _curr text;
  _next text;
BEGIN
  SELECT id, current_session_id INTO _doc_id, _curr FROM public.doctors WHERE user_id = auth.uid();
  IF _doc_id IS NULL THEN RAISE EXCEPTION 'Not a doctor'; END IF;

  IF _curr IS NOT NULL THEN
    UPDATE public.chat_sessions SET status = 'ended', ended_at = now() WHERE id = _curr AND doctor_id = _doc_id;
  END IF;

  SELECT id INTO _next FROM public.chat_sessions 
  WHERE doctor_id = _doc_id AND status = 'queued'
  ORDER BY queue_position NULLS FIRST, created_at
  LIMIT 1;

  IF _next IS NOT NULL THEN
    UPDATE public.chat_sessions SET status = 'active', started_at = now() WHERE id = _next;
    UPDATE public.doctors SET is_busy = true, current_session_id = _next WHERE id = _doc_id;
    RETURN QUERY SELECT _next;
  ELSE
    UPDATE public.doctors SET is_busy = false, current_session_id = NULL WHERE id = _doc_id;
    RETURN QUERY SELECT NULL::text;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.doctor_end_session() TO authenticated;
