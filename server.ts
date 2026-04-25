import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

const BASE = 'https://gateway.unicesumar.edu.br/';
const BASE_CAP = BASE + 'central-captacao-standalone-api/';

const TA = String.fromCharCode(
  66,97,115,105,99,32,81,86,86,85,83,70,57,84,82,86,74,87,82,86,73,54,
  99,50,86,106,99,109,86,48
);

let _oauthToken = null;
let _oauthExpiry = 0;

async function getOAuthToken() {
  if (_oauthToken && Date.now() < _oauthExpiry) return _oauthToken;
  const r = await fetch(BASE + 'auth-server/oauth/token', {
    method: 'POST',
    headers: { Authorization: TA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error('OAuth ' + r.status);
  const d = await r.json();
  if (!d.access_token) throw new Error('Sem access_token');
  _oauthToken = d.access_token;
  _oauthExpiry = Date.now() + 55 * 60 * 1000;
  return _oauthToken;
}

async function getCdToken(tok) {
  const r = await fetch(BASE_CAP + 'candidato/gerarToken', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dsUtmCampaign: null, dsUtmMedium: null, dsUtmSource: null,
      dsUtmContent: null, dsUtmTerm: null, dsGclid: null,
      cdGoogleId: null, cdIp: '',
    }),
  });
  if (!r.ok) throw new Error('gerarToken ' + r.status);
  const d = await r.json();
  if (!d.cdToken) throw new Error('Sem cdToken');
  return d.cdToken;
}

function toEspreId(idCurso) {
  return (idCurso && idCurso.startsWith('EGRAD_'))
    ? 'ESPRE_' + idCurso.slice(6)
    : null;
}

function toSlug(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route
  app.all('/api/uc', async (req, res) => {
    const origin = req.headers['origin'] || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    const { action, idCurso, idEstado, idPolo, urlSlug: urlSlugParam, nmCurso: nmCursoParam } = req.query || {};

    try {
      const tok = await getOAuthToken();

      if (action === 'cursos') {
        const r = await fetch(BASE_CAP + 'curso?idPais=90', {
          headers: { Authorization: 'bearer ' + tok },
        });
        const data = await r.json();
        return res.json(data);
      }

      if (action === 'estados') {
        if (!idCurso) throw new Error('idCurso obrigatório');
        let r = await fetch(
          `${BASE_CAP}estado?idPais=90&idCurso=${encodeURIComponent(idCurso as string)}`,
          { headers: { Authorization: 'bearer ' + tok } }
        );
        let data = await r.json();

        if (Array.isArray(data) && data.length === 0) {
          console.log(`[server] Nenhum estado para ${idCurso}, tentando Semipresencial...`);
          const spreId = toEspreId(idCurso as string);
          if (spreId) {
            const r2 = await fetch(
              `${BASE_CAP}estado?idPais=90&idCurso=${encodeURIComponent(spreId)}`,
              { headers: { Authorization: 'bearer ' + tok } }
            );
            const data2 = await r2.json();
            if (Array.isArray(data2) && data2.length > 0) data = data2;
          }
        }
        console.log(`[server] Estados retornados: ${Array.isArray(data) ? data.length : 0}`);
        return res.json(data);
      }

      if (action === 'polos') {
        if (!idCurso || !idEstado) throw new Error('idCurso e idEstado obrigatórios');
        let r = await fetch(
          `${BASE_CAP}polo?idPais=90&idCurso=${encodeURIComponent(idCurso as string)}&idEstado=${encodeURIComponent(idEstado as string)}`,
          { headers: { Authorization: 'bearer ' + tok } }
        );
        let data = await r.json();

        if (Array.isArray(data) && data.length === 0) {
          console.log(`[server] Nenhum polo para ${idCurso}+${idEstado}, tentando Semipresencial...`);
          const spreId = toEspreId(idCurso as string);
          if (spreId) {
            const r2 = await fetch(
              `${BASE_CAP}polo?idPais=90&idCurso=${encodeURIComponent(spreId)}&idEstado=${encodeURIComponent(idEstado as string)}`,
              { headers: { Authorization: 'bearer ' + tok } }
            );
            const data2 = await r2.json();
            if (Array.isArray(data2) && data2.length > 0) data = data2;
          }
        }
        console.log(`[server] Polos retornados: ${Array.isArray(data) ? data.length : 0}`);
        return res.json(data);
      }

      if (action === 'interessado' && req.method === 'POST') {
        const lead = req.body;
        const cdToken = await getCdToken(tok);

        const ri = await fetch(BASE_CAP + `candidato/${cdToken}/interessado`, {
          method: 'PUT',
          headers: { Authorization: 'bearer ' + tok, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pais:   { idPais:   90 },
            curso:  { idCurso:  lead.idCurso },
            estado: { idEstado: parseInt(lead.idEstado) },
            polo:   { idPolo:   parseInt(lead.idPolo) },
          }),
        });
        const di = await ri.json();
        const newToken = di.cdToken || cdToken;

        await fetch(BASE_CAP + `candidato/${newToken}/contato`, {
          method: 'PUT',
          headers: { Authorization: 'bearer ' + tok, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nmCandidato:        lead.nmCandidato,
            dsEmail:            lead.dsEmail,
            nrTelefone:         lead.nrTelefone,
            idOpcaoEnsinoMedio: null,
          }),
        });

        return res.json({ ok: true, idCandidato: di.idCandidato });
      }

      if (action === 'preco') {
        if (!idCurso || !idPolo) throw new Error('idCurso e idPolo obrigatórios');

        function extractPreco(raw: any) {
          const obj = Array.isArray(raw)
            ? (raw.find((d: any) => d.vlPrimeira !== undefined && d.vlPrimeira !== null) ?? raw[0] ?? {})
            : (raw || {});
          
          // API retorna vlPrimeira como string ("19.47") ou número - aceitar ambos
          const vl = obj?.vlPrimeira;
          if (vl !== undefined && vl !== null && vl !== '') {
            // Normalizar para número para facilitar uso no frontend
            return {
              ...obj,
              vlPrimeira: parseFloat(String(vl)),
              vlDemais:   parseFloat(String(obj?.vlDemais  || '0')),
              vlDemaisBruto: parseFloat(String(obj?.vlDemaisBruto || obj?.vlBruto || '0')),
            };
          }
          return null;
        }

        let data = null;
        let usedEspre = false;
        const spreId = toEspreId(idCurso as string);

        try {
          const r1 = await fetch(
            `${BASE_CAP}curso?idCurso=${encodeURIComponent(idCurso as string)}&idPolo=${encodeURIComponent(idPolo as string)}`,
            { headers: { Authorization: 'bearer ' + tok } }
          );
          const raw1 = await r1.json();
          data = extractPreco(raw1);
        } catch(e) { console.log(e); }

        if (!data && spreId) {
          try {
            const r1b = await fetch(
              `${BASE_CAP}curso?idCurso=${encodeURIComponent(spreId)}&idPolo=${encodeURIComponent(idPolo as string)}`,
              { headers: { Authorization: 'bearer ' + tok } }
            );
            const raw1b = await r1b.json();
            data = extractPreco(raw1b);
            if (data) usedEspre = true;
          } catch(e) { console.log(e); }
        }

        if (!data) {
          try {
            const r2 = await fetch(
              `${BASE_CAP}polo/${encodeURIComponent(idPolo as string)}?idCurso=${encodeURIComponent(idCurso as string)}`,
              { headers: { Authorization: 'bearer ' + tok } }
            );
            const raw2 = await r2.json();
            data = extractPreco(raw2);
          } catch(e) { console.log(e); }
        }

        if (!data && spreId) {
          try {
            const r2b = await fetch(
              `${BASE_CAP}polo/${encodeURIComponent(idPolo as string)}?idCurso=${encodeURIComponent(spreId)}`,
              { headers: { Authorization: 'bearer ' + tok } }
            );
            const raw2b = await r2b.json();
            data = extractPreco(raw2b);
            if (data) usedEspre = true;
          } catch(e) { console.log(e); }
        }

        if (!data) {
           data = { _fallback: true, _isSemipresencial: usedEspre };
        } else {
           data._isSemipresencial = usedEspre;
        }

        return res.json(data);
      }

      if (action === 'cursoConteudo') {
        if (!idCurso) throw new Error('idCurso obrigatório');

        const slugFromId = (idCurso as string).toLowerCase()
          .replace(/^egrad_|^epos_|^espre_|^epres_/, '')
          .replace(/_/g, '-');

        const slugFromName = nmCursoParam ? toSlug(nmCursoParam as string) : null;

        let dCurso: any = {};
        let urlSlug = urlSlugParam || slugFromName || slugFromId;

        const spreIdConteudo = toEspreId(idCurso as string);
        const idsToTryConteudo = [idCurso];
        if (spreIdConteudo) idsToTryConteudo.push(spreIdConteudo);

        for (const tryId of idsToTryConteudo) {
          try {
            const rCurso = await fetch(
              `${BASE_CAP}curso/${encodeURIComponent(tryId as string)}`,
              { headers: { Authorization: 'bearer ' + tok } }
            );
            if (rCurso.ok) {
              const d = await rCurso.json();
              const courseObj = Array.isArray(d)
                ? (d.find(x => x.cdUrlCurso) || d[0])
                : d;
              if (courseObj && typeof courseObj === 'object' && Object.keys(courseObj).length > 0) {
                // Se a resposta retornou sucesso mas não tem nenhuma parte de descrição, provavelmente é um placeholder EGRAD que precisa cair no ESPRE.
                const hasDescription = !!(courseObj.dsDescricao || courseObj.dsApresentacao || courseObj.dsEmenta || courseObj.ementa || courseObj.apresentacao);
                
                if (!hasDescription && tryId !== spreIdConteudo && spreIdConteudo) {
                  console.log(`[server] ${tryId} retornou objeto sem descrição. Tentando fallback para ${spreIdConteudo}...`);
                  continue; // Pula e tenta o próximo
                }

                dCurso = courseObj;
                dCurso._isSemipresencial = (tryId === spreIdConteudo);
                if (courseObj.cdUrlCurso && !urlSlugParam) {
                  urlSlug = courseObj.cdUrlCurso;
                }
                break;
              }
            }
          } catch (e) {
            console.log(e);
          }
        }

        const apiDescription =
          dCurso?.dsDescricao ||
          dCurso?.dsApresentacao ||
          dCurso?.dsEmenta ||
          dCurso?.ementa ||
          dCurso?.apresentacao ||
          null;

        let description = null, faq: any[] = [], videoId = null, matriz: any[] = [];

        async function fetchCoursePage(primarySlug: string) {
          const slugsToTry = [primarySlug];
          if (!primarySlug.includes('semipresencial')) {
            slugsToTry.push(primarySlug + '-semipresencial');
          }
          if (!primarySlug.includes('ead')) {
            slugsToTry.push(primarySlug + '-ead');
          }

          const bases = [
            'https://inscricoes.unicesumar.edu.br/curso/',
            'https://www.unicesumar.edu.br/graduacao/',
          ];

          for (const slug of slugsToTry) {
            for (const base of bases) {
              const url = base + slug;
              try {
                const controller = new AbortController();
                const tid = setTimeout(() => controller.abort(), 6000);
                const r = await fetch(url, {
                  signal: controller.signal,
                  headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'text/html',
                    'Accept-Language': 'pt-BR,pt;q=0.9',
                  },
                });
                clearTimeout(tid);
                if (r.ok) {
                  const html = await r.text();
                  return { html, source: base };
                }
              } catch (e) {
                console.log(e);
              }
            }
          }
          return null;
        }

        const [pageResult, matrizResult] = await Promise.allSettled([
          fetchCoursePage(urlSlug as string),
          fetch(`${BASE_CAP}matriz-curricular?idCurso=${encodeURIComponent(idCurso as string)}`, {
            headers: { Authorization: 'bearer ' + tok }
          }).then(r => r.json()),
        ]);

        if (pageResult.status === 'fulfilled' && pageResult.value) {
          const { html } = pageResult.value;

          const ldBlocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
          for (const block of ldBlocks) {
            try {
              const raw = JSON.parse(block[1]);
              const schemas = raw['@graph'] ? raw['@graph'] : [raw];
              for (const schema of schemas) {
                const t = schema['@type'];
                if (schema.description && !description) {
                  description = typeof schema.description === 'string'
                    ? schema.description
                    : schema.description?.['@value'] || null;
                }
                if (!faq.length && (t === 'FAQPage' || (Array.isArray(t) && t.includes('FAQPage')))) {
                  const items = schema.mainEntity || schema.hasPart || [];
                  if (Array.isArray(items) && items.length) {
                    faq = items.map((q: any) => ({
                      pergunta: q.name || q.text || '',
                      resposta: q.acceptedAnswer?.text || q.suggestedAnswer?.text || ''
                    })).filter((q: any) => q.pergunta);
                  }
                }
              }
            } catch (_) {}
          }

          if (!description) {
            const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{20,})["']/i)
                          || html.match(/<meta[^>]+content=["']([^"']{20,})["'][^>]+name=["']description["']/i);
            if (metaMatch) description = metaMatch[1];
          }

          const ytPatterns = [
            /vi_webp\/([A-Za-z0-9_-]{11})\//g,
            /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/g,
            /img\.youtube\.com\/vi\/([A-Za-z0-9_-]{11})\//g,
            /youtu\.be\/([A-Za-z0-9_-]{11})/g,
            /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/g,
            /"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g,
          ];
          const ytIds = new Set();
          for (const pat of ytPatterns) {
            for (const m of html.matchAll(pat)) ytIds.add(m[1]);
          }
          videoId = [...ytIds][0] || null;
        }

        if (!description && apiDescription) {
          description = apiDescription;
        }

        if (matrizResult.status === 'fulfilled' && Array.isArray(matrizResult.value)) {
          matriz = matrizResult.value;
        }

        return res.json({ curso: dCurso, description, faq, videoId, matriz });
      }

      return res.status(400).json({ error: 'Ação desconhecida: ' + action });
    } catch (e: any) {
      console.error('[proxy] Erro:', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
