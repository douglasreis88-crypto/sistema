
DROP POLICY IF EXISTS "Authenticated can update conferences" ON public.conferences;
DROP POLICY IF EXISTS "Authenticated can delete conferences" ON public.conferences;

CREATE POLICY "Creator or admin can update conferences"
  ON public.conferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creator or admin can delete conferences"
  ON public.conferences FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
