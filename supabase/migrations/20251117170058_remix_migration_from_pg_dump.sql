--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: hospital_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.hospital_status AS ENUM (
    'empty',
    'low_traffic',
    'medium_traffic',
    'high_traffic',
    'very_crowded'
);


--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'deposit',
    'withdraw',
    'consultation',
    'transfer'
);


--
-- Name: user_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_type AS ENUM (
    'user',
    'doctor',
    'hospital'
);


--
-- Name: approve_hospital_request(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_hospital_request(_request_id uuid, _approve boolean, _notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  req RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO req FROM public.hospital_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  UPDATE public.hospital_requests
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      admin_notes = COALESCE(_notes, admin_notes),
      updated_at = now()
  WHERE id = _request_id;

  IF _approve THEN
    -- Upsert hospital by user_id without relying on unique constraints
    IF EXISTS (SELECT 1 FROM public.hospitals WHERE user_id = req.user_id) THEN
      UPDATE public.hospitals
      SET name = req.hospital_name,
          email = req.email,
          phone = req.phone,
          logo_url = req.logo_url,
          is_approved = true,
          is_active = true,
          updated_at = now()
      WHERE user_id = req.user_id;
    ELSE
      INSERT INTO public.hospitals (user_id, name, email, phone, logo_url, is_approved, is_active)
      VALUES (req.user_id, req.hospital_name, req.email, req.phone, req.logo_url, true, true);
    END IF;

    -- Ensure user has hospital role
    INSERT INTO public.user_roles (user_id, role)
    SELECT req.user_id, 'hospital'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = req.user_id AND role = 'hospital'
    );
  END IF;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, user_type, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'user'),
    NEW.email
  );
  
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: perform_consultation(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.perform_consultation(_doctor_id uuid) RETURNS TABLE(tx_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id uuid := auth.uid();
  _fee numeric;
  _doctor_user_id uuid;
  _dept_id uuid;
  _tx text;
  _user_balance numeric;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT COALESCE(d.consultation_fee, d.price), d.user_id, d.department_id INTO _fee, _doctor_user_id, _dept_id FROM public.doctors d WHERE d.id = _doctor_id AND d.is_active = true;
  IF _fee IS NULL THEN RAISE EXCEPTION 'Doctor not found or inactive'; END IF;

  SELECT balance INTO _user_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF _user_balance IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF _user_balance < _fee THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  PERFORM 1 FROM public.wallets WHERE user_id = _doctor_user_id FOR UPDATE;
  UPDATE public.wallets SET balance = balance - _fee WHERE user_id = _user_id;
  UPDATE public.wallets SET balance = balance + _fee WHERE user_id = _doctor_user_id;

  _tx := public.generate_op_id('CS');
  INSERT INTO public.transactions(id, user_id, doctor_id, amount, type, description) VALUES (_tx, _user_id, _doctor_id, _fee, 'consultation', 'استشارة');
  INSERT INTO public.consultations(id, user_id, doctor_id, amount, department_id, status) VALUES (_tx, _user_id, _doctor_id, _fee, _dept_id, 'active');
  RETURN QUERY SELECT _tx;
END; $$;


--
-- Name: perform_transfer(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.perform_transfer(_receiver_id uuid, _amount numeric) RETURNS TABLE(tx_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _sender_id uuid := auth.uid();
  _tx text;
  _sender_balance numeric;
BEGIN
  IF _sender_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _receiver_id IS NULL OR _receiver_id = _sender_id THEN RAISE EXCEPTION 'Invalid receiver'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  SELECT balance INTO _sender_balance FROM public.wallets WHERE user_id = _sender_id FOR UPDATE;
  IF _sender_balance IS NULL THEN RAISE EXCEPTION 'Sender wallet not found'; END IF;
  IF _sender_balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  PERFORM 1 FROM public.wallets WHERE user_id = _receiver_id FOR UPDATE;

  UPDATE public.wallets SET balance = balance - _amount WHERE user_id = _sender_id;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _receiver_id;

  _tx := public.generate_op_id('TR');
  INSERT INTO public.transactions(id, user_id, receiver_id, amount, type, description) VALUES (_tx, _sender_id, _receiver_id, _amount, 'transfer', 'تحويل رصيد');
  RETURN QUERY SELECT _tx;
END; $$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultations (
    id text NOT NULL,
    user_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    department_id uuid,
    status text DEFAULT 'active'::text
);


--
-- Name: deposit_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deposit_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    proof_image_url text NOT NULL,
    status public.request_status DEFAULT 'pending'::public.request_status NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deposit_requests_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: doctor_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doctor_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    specialization text NOT NULL,
    certificate_url text NOT NULL,
    id_card_front_url text NOT NULL,
    id_card_back_url text NOT NULL,
    status text DEFAULT 'pending'::text,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT doctor_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctors (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    department_id uuid NOT NULL,
    specialization_ar text NOT NULL,
    specialization_en text NOT NULL,
    price numeric(10,2) NOT NULL,
    whatsapp_number text NOT NULL,
    bio_ar text,
    bio_en text,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_verified boolean DEFAULT false,
    verification_requested_at timestamp with time zone,
    phone_number text,
    consultation_fee numeric,
    doctor_name text,
    address text,
    CONSTRAINT doctors_price_check CHECK ((price > (0)::numeric))
);


--
-- Name: hospital_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hospital_bookings (
    id text DEFAULT ('HB'::text || lpad((floor((random() * (999999)::double precision)))::text, 6, '0'::text)) NOT NULL,
    hospital_id uuid NOT NULL,
    user_id uuid,
    patient_name text NOT NULL,
    patient_phone text NOT NULL,
    patient_area text,
    doctor_id uuid,
    doctor_name text,
    specialization text,
    price numeric DEFAULT 0,
    is_paid boolean DEFAULT false,
    payment_method text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text
);


--
-- Name: hospital_doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hospital_doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id uuid NOT NULL,
    doctor_email text NOT NULL,
    doctor_password text NOT NULL,
    doctor_name text NOT NULL,
    specialization text NOT NULL,
    image_url text,
    phone text,
    consultation_price numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_available boolean DEFAULT false,
    available_from timestamp with time zone,
    available_to timestamp with time zone
);


--
-- Name: hospital_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hospital_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    hospital_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    logo_url text,
    ownership_docs_url text NOT NULL,
    status text DEFAULT 'pending'::text,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hospital_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hospital_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hospital_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: hospitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hospitals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    logo_url text,
    status public.hospital_status DEFAULT 'medium_traffic'::public.hospital_status,
    is_approved boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    latitude double precision,
    longitude double precision
);


--
-- Name: medical_departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_departments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    icon text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    referral_source text,
    user_type public.user_type DEFAULT 'user'::public.user_type NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_url text,
    email text
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id text NOT NULL,
    user_id uuid NOT NULL,
    doctor_id uuid,
    amount numeric(10,2) NOT NULL,
    type public.transaction_type NOT NULL,
    description text,
    receiver_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'user'::text, 'doctor'::text, 'hospital'::text])))
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    balance numeric(10,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallets_balance_check CHECK ((balance >= (0)::numeric))
);


--
-- Name: withdraw_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdraw_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    doctor_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    net_amount numeric(10,2) NOT NULL,
    commission numeric(10,2) DEFAULT 0.00 NOT NULL,
    status public.request_status DEFAULT 'pending'::public.request_status NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT withdraw_requests_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT withdraw_requests_net_amount_check CHECK ((net_amount > (0)::numeric))
);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: deposit_requests deposit_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_requests
    ADD CONSTRAINT deposit_requests_pkey PRIMARY KEY (id);


--
-- Name: doctor_reports doctor_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_reports
    ADD CONSTRAINT doctor_reports_pkey PRIMARY KEY (id);


--
-- Name: doctor_requests doctor_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_requests
    ADD CONSTRAINT doctor_requests_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_user_id_key UNIQUE (user_id);


--
-- Name: hospital_bookings hospital_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_bookings
    ADD CONSTRAINT hospital_bookings_pkey PRIMARY KEY (id);


--
-- Name: hospital_doctors hospital_doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_doctors
    ADD CONSTRAINT hospital_doctors_pkey PRIMARY KEY (id);


--
-- Name: hospital_requests hospital_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_requests
    ADD CONSTRAINT hospital_requests_pkey PRIMARY KEY (id);


--
-- Name: hospital_reviews hospital_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_reviews
    ADD CONSTRAINT hospital_reviews_pkey PRIMARY KEY (id);


--
-- Name: hospitals hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);


--
-- Name: hospitals hospitals_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_user_id_key UNIQUE (user_id);


--
-- Name: medical_departments medical_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_departments
    ADD CONSTRAINT medical_departments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);


--
-- Name: withdraw_requests withdraw_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdraw_requests
    ADD CONSTRAINT withdraw_requests_pkey PRIMARY KEY (id);


--
-- Name: deposit_requests update_deposit_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deposit_requests_updated_at BEFORE UPDATE ON public.deposit_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: doctor_requests update_doctor_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_doctor_requests_updated_at BEFORE UPDATE ON public.doctor_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: doctors update_doctors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hospital_bookings update_hospital_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hospital_bookings_updated_at BEFORE UPDATE ON public.hospital_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hospital_doctors update_hospital_doctors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hospital_doctors_updated_at BEFORE UPDATE ON public.hospital_doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hospital_requests update_hospital_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hospital_requests_updated_at BEFORE UPDATE ON public.hospital_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hospitals update_hospitals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wallets update_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: withdraw_requests update_withdraw_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_withdraw_requests_updated_at BEFORE UPDATE ON public.withdraw_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consultations consultations_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.medical_departments(id);


--
-- Name: consultations consultations_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: consultations consultations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: deposit_requests deposit_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deposit_requests
    ADD CONSTRAINT deposit_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: doctor_reports doctor_reports_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_reports
    ADD CONSTRAINT doctor_reports_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: doctor_reports doctor_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_reports
    ADD CONSTRAINT doctor_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: doctor_requests doctor_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_requests
    ADD CONSTRAINT doctor_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: doctors doctors_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.medical_departments(id);


--
-- Name: doctors doctors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: hospital_bookings hospital_bookings_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_bookings
    ADD CONSTRAINT hospital_bookings_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.hospital_doctors(id) ON DELETE SET NULL;


--
-- Name: hospital_bookings hospital_bookings_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_bookings
    ADD CONSTRAINT hospital_bookings_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;


--
-- Name: hospital_bookings hospital_bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_bookings
    ADD CONSTRAINT hospital_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: hospital_doctors hospital_doctors_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_doctors
    ADD CONSTRAINT hospital_doctors_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;


--
-- Name: hospital_requests hospital_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_requests
    ADD CONSTRAINT hospital_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: hospital_reviews hospital_reviews_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospital_reviews
    ADD CONSTRAINT hospital_reviews_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;


--
-- Name: hospitals hospitals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: transactions transactions_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: withdraw_requests withdraw_requests_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdraw_requests
    ADD CONSTRAINT withdraw_requests_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: hospital_doctors Admins can manage doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage doctors" ON public.hospital_doctors USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: profiles Admins can manage profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage profiles" ON public.profiles USING (public.has_role(auth.uid(), 'admin'::text)) WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: deposit_requests Admins can update deposit requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update deposit requests" ON public.deposit_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::text)) WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: doctor_requests Admins can update doctor requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update doctor requests" ON public.doctor_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::text)) WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: hospital_requests Admins can update requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update requests" ON public.hospital_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: withdraw_requests Admins can update withdraw requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update withdraw requests" ON public.withdraw_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::text)) WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: doctor_reports Admins/owners can read reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins/owners can read reports" ON public.doctor_reports FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::text) OR (doctor_id IN ( SELECT doctors.id
   FROM public.doctors
  WHERE (doctors.user_id = auth.uid())))));


--
-- Name: hospital_bookings Anyone can create bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create bookings" ON public.hospital_bookings FOR INSERT WITH CHECK (true);


--
-- Name: hospital_reviews Anyone can read hospital reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read hospital reviews" ON public.hospital_reviews FOR SELECT USING (true);


--
-- Name: doctors Anyone can view active doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active doctors" ON public.doctors FOR SELECT USING (((is_active = true) OR (user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: hospitals Anyone can view approved hospitals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved hospitals" ON public.hospitals FOR SELECT USING (((is_approved = true) OR (user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: medical_departments Anyone can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view departments" ON public.medical_departments FOR SELECT USING (true);


--
-- Name: hospital_doctors Anyone can view hospital doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view hospital doctors" ON public.hospital_doctors FOR SELECT USING (true);


--
-- Name: doctors Doctors can create their profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors can create their profile" ON public.doctors FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: withdraw_requests Doctors can create withdraw requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors can create withdraw requests" ON public.withdraw_requests FOR INSERT WITH CHECK ((doctor_id IN ( SELECT doctors.id
   FROM public.doctors
  WHERE (doctors.user_id = auth.uid()))));


--
-- Name: doctors Doctors can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors can update their own profile" ON public.doctors FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: withdraw_requests Doctors can view their own withdraw requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors can view their own withdraw requests" ON public.withdraw_requests FOR SELECT USING (((doctor_id IN ( SELECT doctors.id
   FROM public.doctors
  WHERE (doctors.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: hospital_doctors Hospitals can manage their doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hospitals can manage their doctors" ON public.hospital_doctors USING ((hospital_id IN ( SELECT hospitals.id
   FROM public.hospitals
  WHERE (hospitals.user_id = auth.uid()))));


--
-- Name: hospital_bookings Hospitals can update their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hospitals can update their bookings" ON public.hospital_bookings FOR UPDATE USING (((hospital_id IN ( SELECT hospitals.id
   FROM public.hospitals
  WHERE (hospitals.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: hospitals Hospitals can update their own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hospitals can update their own data" ON public.hospitals FOR UPDATE USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: consultations System can insert consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert consultations" ON public.consultations FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: transactions System can insert transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert transactions" ON public.transactions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: wallets System can update wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update wallets" ON public.wallets FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: deposit_requests Users can create deposit requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create deposit requests" ON public.deposit_requests FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: doctor_reports Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON public.doctor_reports FOR INSERT WITH CHECK ((reporter_id = auth.uid()));


--
-- Name: hospital_requests Users can create requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create requests" ON public.hospital_requests FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: doctor_requests Users can create their own doctor request; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own doctor request" ON public.doctor_requests FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: hospital_reviews Users can create their reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their reviews" ON public.hospital_reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: hospitals Users can insert their hospital; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their hospital" ON public.hospitals FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: wallets Users can insert their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own wallet" ON public.wallets FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: hospital_reviews Users can update their own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own reviews" ON public.hospital_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: hospital_bookings Users can view their own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bookings" ON public.hospital_bookings FOR SELECT USING (((user_id = auth.uid()) OR (hospital_id IN ( SELECT hospitals.id
   FROM public.hospitals
  WHERE (hospitals.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: consultations Users can view their own consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own consultations" ON public.consultations FOR SELECT USING (((user_id = auth.uid()) OR (doctor_id IN ( SELECT doctors.id
   FROM public.doctors
  WHERE (doctors.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: deposit_requests Users can view their own deposit requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own deposit requests" ON public.deposit_requests FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: doctor_requests Users can view their own doctor request; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own doctor request" ON public.doctor_requests FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (((auth.uid() = id) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: hospital_requests Users can view their own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own requests" ON public.hospital_requests FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (((user_id = auth.uid()) OR (receiver_id = auth.uid()) OR (doctor_id IN ( SELECT doctors.id
   FROM public.doctors
  WHERE (doctors.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: wallets Users can view their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: consultations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

--
-- Name: deposit_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doctor_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doctor_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: doctors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

--
-- Name: hospital_bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hospital_bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: hospital_doctors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hospital_doctors ENABLE ROW LEVEL SECURITY;

--
-- Name: hospital_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hospital_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: hospital_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hospital_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: hospitals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

--
-- Name: medical_departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medical_departments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: withdraw_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


