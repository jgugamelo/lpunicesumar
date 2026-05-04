-- 1. Criação de Tags e Associação com Leads

-- Tabela de Tags (únicas para todos os consultores)
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID REFERENCES public.consultants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Políticas da tabela tags
-- Todos os usuários autenticados podem ver as tags
CREATE POLICY "Tags visíveis para todos" ON public.tags
    FOR SELECT TO authenticated USING (true);

-- Qualquer consultor pode criar uma tag
CREATE POLICY "Consultores podem criar tags" ON public.tags
    FOR INSERT TO authenticated WITH CHECK (true);

-- Apenas admins podem deletar tags
CREATE POLICY "Apenas admins podem deletar tags" ON public.tags
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.consultants
            WHERE consultants.user_id = auth.uid() AND consultants.role = 'admin'
        )
    );

-- Tabela de relacionamento entre Leads e Tags (lead_tags)
CREATE TABLE IF NOT EXISTS public.lead_tags (
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.consultants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (lead_id, tag_id)
);

-- Habilitar RLS na tabela lead_tags
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

-- Políticas da tabela lead_tags
CREATE POLICY "Lead tags visíveis para todos" ON public.lead_tags
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Consultores podem atribuir tags a leads" ON public.lead_tags
    FOR INSERT TO authenticated WITH CHECK (true);

-- Consultor pode remover tag que ele mesmo inseriu, ou Admin pode remover qualquer uma
CREATE POLICY "Consultor remove própria tag ou Admin remove qualquer" ON public.lead_tags
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.consultants
            WHERE consultants.user_id = auth.uid() AND (consultants.id = lead_tags.assigned_by OR consultants.role = 'admin')
        )
    );

-- Função e Trigger para limitar no máximo 5 tags por lead
CREATE OR REPLACE FUNCTION check_max_tags_per_lead()
RETURNS TRIGGER AS $$
DECLARE
    tag_count INT;
BEGIN
    SELECT COUNT(*) INTO tag_count FROM public.lead_tags WHERE lead_id = NEW.lead_id;
    IF tag_count >= 5 THEN
        RAISE EXCEPTION 'Um lead pode ter no máximo 5 tags associadas.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_tags
BEFORE INSERT ON public.lead_tags
FOR EACH ROW EXECUTE FUNCTION check_max_tags_per_lead();


-- 2. Criação de Mensagens Rápidas (atalho "/")

-- Tabela para armazenar as mensagens rápidas de cada consultor
CREATE TABLE IF NOT EXISTS public.quick_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortcut VARCHAR(50) NOT NULL, -- Exemplo: 'ola', 'preco'
    content TEXT NOT NULL,         -- O texto completo da mensagem
    consultant_id UUID REFERENCES public.consultants(id) ON DELETE CASCADE, -- Se NULL, pode ser uma mensagem global do sistema
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela quick_messages
ALTER TABLE public.quick_messages ENABLE ROW LEVEL SECURITY;

-- Consultor pode ver mensagens globais (consultant_id IS NULL) ou as suas próprias
CREATE POLICY "Ver mensagens rápidas" ON public.quick_messages
    FOR SELECT TO authenticated
    USING (
        consultant_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.consultants 
            WHERE consultants.user_id = auth.uid() AND consultants.id = quick_messages.consultant_id
        )
    );

-- Consultores podem criar suas mensagens rápidas
CREATE POLICY "Criar mensagens rápidas" ON public.quick_messages
    FOR INSERT TO authenticated WITH CHECK (true);

-- Consultores podem alterar/excluir suas próprias mensagens
CREATE POLICY "Modificar próprias mensagens rápidas" ON public.quick_messages
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.consultants 
            WHERE consultants.user_id = auth.uid() AND consultants.id = quick_messages.consultant_id
        )
    );


-- 3. Fixar mensagens no topo da lista de conversas

-- Adiciona a coluna is_pinned na tabela de chats para permitir fixar conversas importantes
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 4. Gravar a URL completa nas visitas
ALTER TABLE public.page_visits ADD COLUMN IF NOT EXISTS full_url TEXT;
