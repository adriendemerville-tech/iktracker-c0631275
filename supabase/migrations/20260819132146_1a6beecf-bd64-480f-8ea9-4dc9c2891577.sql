DO $$
DECLARE
  r RECORD;
  s TEXT;
  out_txt TEXT;
  pos INT;
  m_start INT;
  m_end INT;
  seg TEXT;
  flip BOOLEAN;
BEGIN
  FOR r IN SELECT id, content FROM public.blog_posts WHERE status = 'published' AND content ~* 'barème[^.]{0,40}URSSAF' LOOP
    s := r.content;
    out_txt := '';
    pos := 1;
    flip := TRUE;
    LOOP
      m_start := regexp_instr(s, 'barème[^.]{0,40}URSSAF', pos, 1, 0, 'i');
      EXIT WHEN m_start = 0;
      m_end := regexp_instr(s, 'barème[^.]{0,40}URSSAF', pos, 1, 1, 'i');
      seg := substring(s FROM m_start FOR m_end - m_start);
      IF flip THEN
        seg := regexp_replace(seg, 'URSSAF', 'DGFiP (BOFiP)', 'i');
      END IF;
      out_txt := out_txt || substring(s FROM pos FOR m_start - pos) || seg;
      pos := m_end;
      flip := NOT flip;
    END LOOP;
    out_txt := out_txt || substring(s FROM pos);
    IF out_txt <> r.content THEN
      UPDATE public.blog_posts SET content = out_txt WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

UPDATE public.blog_posts
SET content = regexp_replace(
      regexp_replace(
        regexp_replace(content, '100\s?% ?conforme', 'conforme', 'gi'),
        'reconnu par l(''|’)administration', 'conçu pour répondre aux exigences de l''administration', 'gi'),
      'sans risque', 'en limitant fortement le risque', 'gi')
WHERE status = 'published'
  AND (content ~* '100\s?% ?conforme' OR content ~* 'sans risque' OR content ~* 'reconnu par l(''|’)administration');