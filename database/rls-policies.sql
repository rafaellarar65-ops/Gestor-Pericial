-- RLS policies for Pericias Manager Pro (Supabase/PostgreSQL)
-- Enterprise multi-tenant approach:
-- auth.uid() => user_id
-- tenantId   => tenant_id (resolved by function current_tenant_id())

-- =========================================
-- Helper function: resolve tenant from user
-- =========================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "tenantId"
  FROM public."User"
  WHERE id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;

-- =========================================
-- Enable RLS on app tables
-- =========================================
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cidade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tribunal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Vara" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TipoPericia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Modalidade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Local" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Pericia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Lawyer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LawyerOnPericia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CaseDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PreLaudo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ExamPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ExamPerformed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PhysicalManeuver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."KnowledgeItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgendaEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgendaTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recebimento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UnmatchedPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Despesa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BankTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CashLedgerItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SmartRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AutomationRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LogStatus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DailyUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IntegrationSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeleSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchedulingBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CnjSync" ENABLE ROW LEVEL SECURITY;

-- =========================================
-- Cleanup existing policies in scoped tables
-- =========================================
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','UserProfile','Cidade','Tribunal','Vara','TipoPericia','Modalidade','Status','Local','Pericia',
    'Lawyer','LawyerOnPericia','CaseDocument','PreLaudo','ExamPlan','ExamPerformed','PhysicalManeuver',
    'KnowledgeItem','AgendaEvent','AgendaTask','Recebimento','ImportBatch','UnmatchedPayment','Despesa',
    'BankTransaction','CashLedgerItem','PaymentProfile','Payer','SmartRule','AutomationRule','LogStatus',
    'ActivityLog','DailyUsage','EmailConfig','EmailTemplate','IntegrationSettings','NotificationConfig',
    'TeleSlot','SchedulingBatch','CnjSync'
  ]
  LOOP
    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END
$$;

-- =========================================
-- User / UserProfile policies
-- =========================================
-- User: self access + tenant ADMIN can read/update users from same tenant.
CREATE POLICY user_select_tenant
ON public."User"
FOR SELECT
USING (
  id = auth.uid()
  OR (
    "tenantId" = public.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = auth.uid()
        AND u."tenantId" = public.current_tenant_id()
        AND u.role = 'ADMIN'
    )
  )
);

CREATE POLICY user_update_tenant
ON public."User"
FOR UPDATE
USING (
  id = auth.uid()
  OR (
    "tenantId" = public.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = auth.uid()
        AND u."tenantId" = public.current_tenant_id()
        AND u.role = 'ADMIN'
    )
  )
)
WITH CHECK (
  "tenantId" = public.current_tenant_id()
);

-- Intentionally no INSERT/DELETE policy for authenticated users.

CREATE POLICY user_profile_select_tenant
ON public."UserProfile"
FOR SELECT
USING (
  "userId" = auth.uid()
  OR (
    "tenantId" = public.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = auth.uid()
        AND u."tenantId" = public.current_tenant_id()
        AND u.role = 'ADMIN'
    )
  )
);

CREATE POLICY user_profile_update_tenant
ON public."UserProfile"
FOR UPDATE
USING (
  "userId" = auth.uid()
  OR (
    "tenantId" = public.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = auth.uid()
        AND u."tenantId" = public.current_tenant_id()
        AND u.role = 'ADMIN'
    )
  )
)
WITH CHECK (
  "tenantId" = public.current_tenant_id()
);

-- Intentionally no INSERT/DELETE policy for authenticated users.

-- =========================================
-- Generic tenant policies for tenant-scoped tables
-- =========================================
DO $$
DECLARE
  t text;
  base text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Cidade','Tribunal','Vara','TipoPericia','Modalidade','Status','Local','Pericia',
    'Lawyer','LawyerOnPericia','CaseDocument','PreLaudo','ExamPlan','ExamPerformed','PhysicalManeuver',
    'KnowledgeItem','AgendaEvent','AgendaTask','Recebimento','ImportBatch','UnmatchedPayment','Despesa',
    'BankTransaction','CashLedgerItem','PaymentProfile','Payer','SmartRule','AutomationRule',
    'ActivityLog','DailyUsage','EmailConfig','EmailTemplate','IntegrationSettings','NotificationConfig',
    'TeleSlot','SchedulingBatch','CnjSync'
  ]
  LOOP
    base := lower(t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING ("tenantId" = public.current_tenant_id())',
      base || '_select_tenant',
      t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK ("tenantId" = public.current_tenant_id())',
      base || '_insert_tenant',
      t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING ("tenantId" = public.current_tenant_id()) WITH CHECK ("tenantId" = public.current_tenant_id())',
      base || '_update_tenant',
      t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING ("tenantId" = public.current_tenant_id())',
      base || '_delete_tenant',
      t
    );
  END LOOP;
END
$$;

-- =========================================
-- LogStatus immutable audit trail (INSERT-only)
-- =========================================
CREATE POLICY log_status_select_tenant
ON public."LogStatus"
FOR SELECT
USING ("tenantId" = public.current_tenant_id());

CREATE POLICY log_status_insert_tenant
ON public."LogStatus"
FOR INSERT
WITH CHECK ("tenantId" = public.current_tenant_id());

-- No UPDATE/DELETE policies on purpose.

-- =========================================
-- Public upload session access (token-based)
-- =========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'upload_sessions'
  ) THEN
    EXECUTE 'ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS upload_sessions_public_read ON public.upload_sessions';
    EXECUTE 'CREATE POLICY upload_sessions_public_read ON public.upload_sessions FOR SELECT USING (public_token = current_setting(''request.headers.x-public-token'', true)::text)';
  END IF;
END
$$;
