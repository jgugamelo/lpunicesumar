# Documentação Técnica - Landing Page UniCesumar

Esta documentação descreve a arquitetura, estrutura de arquivos e principais mecânicas de negócio implementadas na aplicação de Captação de Leads (Landing Page) da UniCesumar.

## 🏗 Visão Geral da Arquitetura

A aplicação é uma solução **Full-Stack** baseada em um monorepo que combina um frontend moderno (SPA) com um backend no padrão BFF (Backend For Frontend):

- **Frontend:** Desenvolvido em React + TypeScript, utilizando Vite como bundler e Tailwind CSS para estilização (mobile-first, responsivo).
- **Backend (Proxy):** Desenvolvido em Node.js com Express (`server.ts`). Ele não possui banco de dados próprio; seu papel exclusivo é atuar como uma camada intermediária segura (Proxy) interagindo com a API oficial da UniCesumar (CAP) e mitigando inconsistências de CORS, autenticação e lacunas de dados.

---

## 📁 Estrutura de Arquivos

Abaixo está o mapa das principais pastas e arquivos da aplicação:

```text
/
├── server.ts                    # Backend (Express Proxy + Vite Middleware)
├── package.json                 # Dependências e scripts de execução (npm run dev/start)
├── tsconfig.json                # Configurações do compilador TypeScript
├── vite.config.ts               # Configurações do Vite
├── index.html                   # Entry-point do Documento HTML
└── src/
    ├── App.tsx                  # Componente raiz do React (Layout Principal)
    ├── main.tsx                 # Ponto de montagem da aplicação React
    ├── index.css                # Diretivas globais do Tailwind CSS e Google Fonts
    ├── lib/
    │   └── api.ts               # Funções auxiliares (fetchers) de comunicação Frontend <-> Backend
    └── components/              
        ├── LeadForm.tsx         # Componente do Formulário de Leads (Multi-step)
        ├── CourseDetails.tsx    # Exibição rica do conteúdo (Matriz, Faq, Descrição, Vídeo)
        └── Institutional.tsx    # Informações institucionais estáticas (Sobre, Metodologia)
```

---

## ⚙️ Principais Funcionalidades e Mecânicas

### 1. Sistema de Autenticação Segura e Proxy (BFF)
O arquivo `server.ts` isola a base de integração com as APIs oficiais. Todo o tráfego da página web passa pelas rotas locais em `/api/uc`.
- **Prevenção de Exibição de Chaves:** O token "mestre" originado via client id/secret só é transacionado do lado do servidor (`CdToken`). O frontend nunca tem acesso direto às credenciais.

### 2. O Recurso de Fallback Semipresencial (ESPRE vs EGRAD)
O sistema da instituição lista os cursos com prefixos específicos. Cursos semipresenciais muitas vezes chegam da listagem inicial com a tag `EGRAD_` (que falha ou retorna vazia nas consultas de preço e polo).
- **A Solução:** O servidor aplica o interceptador `toEspreId()`. Se uma busca por `EGRAD_` falhar, o sistema automaticamente refaz a requisição silenciosamente trocando o ID por `ESPRE_`. 
- Se obtiver sucesso, além de retornar os dados robustos, ele devolve uma flag invisível `_isSemipresencial: true`. O Frontend captura essa propriedade para mapear corretamente o selo de "Graduação (EAD Semipresencial)", unificando inconsistências de banco de dados diretamente na tela do usuário.

### 3. Enriquecimento de Conteúdo por Scraping (Extrator Dinâmico)
A funcionalidade de "Conteúdo do Curso", também residente no Proxy, faz duas coisas simultâneas (Promise.allSettled):
- Consulta a grade oficial na API (`matriz-curricular`).
- Faz um _Silent Fetch_ (Scraping) na URL comercial da UniCesumar baseada no *slug* gerado do curso. O servidor lê o HTML da página, extrai scripts estruturados (JSON-LD do schema `FAQPage`) para povoar o menu "Dúvidas Frequentes" sem exigir cadastro prévio.
- Extrai IDs ocultos de meta properties (como frames do youtube) pra desenhar o Player do curso promocional com segurança.

### 4. Captação de Leads (LeadForm)
O componente tem estados iterativos para melhorar a jornada:
- Etapa 1: Seleções de Modalidade e Curso. 
- Etapa 2: Preenchimento de dados do Contato (Cadastro Efetivo).
- **Configurações Internas e Ocultação:** A pedido da operação de tráfego, há um objeto no topo de `LeadForm.tsx` (const `CONFIG`) capaz de assumir e fixar um Polo e um Estado específico e ocultar os seletores visuais do usuário para landing pages hiper-focadas geograficamente. Padrão atual usa "DUQUE DE CAXIAS - 25 DE AGOSTO - RJ".

### 5. Matriz Curricular (Resumo e Expansão)
A listagem curricular do `CourseDetails.tsx` recebe as vezes mais de 20 cadernos de estudos.
- Implementado sistema expansível nativo (slice array pattern). Cursos extensos carregam 5 painéis e disponibilizam controle manual limpo ("Ver todos os X módulos"), preservando a conversão e o tamanho vertical da tela.
