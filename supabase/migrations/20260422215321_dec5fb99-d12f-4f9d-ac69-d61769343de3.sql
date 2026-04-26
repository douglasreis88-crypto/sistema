
-- Conferences table for SCPC records
CREATE TABLE public.conferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL DEFAULT 'mensal',
  municipio text,
  entidade text,
  competencia text,
  consolidado text,
  categorias jsonb NOT NULL DEFAULT '{}'::jsonb,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  anotacoes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view conferences"
  ON public.conferences FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert conferences"
  ON public.conferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated can update conferences"
  ON public.conferences FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete conferences"
  ON public.conferences FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER trg_conferences_updated_at
  BEFORE UPDATE ON public.conferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_conferences_municipio ON public.conferences(municipio);
CREATE INDEX idx_conferences_competencia ON public.conferences(competencia);
CREATE INDEX idx_conferences_created_at ON public.conferences(created_at DESC);
