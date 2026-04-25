const PROXY = '/api/uc';

export async function fetchCursos() {
  const r = await fetch(PROXY + '?action=cursos');
  if (!r.ok) throw new Error('cursos ' + r.status);
  return r.json();
}

export async function fetchEstados(idCurso: string) {
  const r = await fetch(`${PROXY}?action=estados&idCurso=${encodeURIComponent(idCurso)}`);
  if (!r.ok) throw new Error('estados ' + r.status);
  return r.json();
}

export async function fetchPolos(idCurso: string, idEstado: string) {
  const r = await fetch(`${PROXY}?action=polos&idCurso=${encodeURIComponent(idCurso)}&idEstado=${encodeURIComponent(idEstado)}`);
  if (!r.ok) throw new Error('polos ' + r.status);
  return r.json();
}

export async function fetchCursoConteudo(idCurso: string, urlSlug?: string | null, nmCurso?: string | null) {
  let url = `${PROXY}?action=cursoConteudo&idCurso=${encodeURIComponent(idCurso)}`;
  if (urlSlug) url += `&urlSlug=${encodeURIComponent(urlSlug)}`;
  if (nmCurso) url += `&nmCurso=${encodeURIComponent(nmCurso)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('cursoConteudo ' + r.status);
  return r.json();
}

export async function fetchPreco(idCurso: string, idPolo: string) {
  const r = await fetch(`${PROXY}?action=preco&idCurso=${encodeURIComponent(idCurso)}&idPolo=${encodeURIComponent(idPolo)}`);
  if (!r.ok) throw new Error('preco ' + r.status);
  return r.json();
}

export async function submitInteressado(payload: any) {
  const r = await fetch(`${PROXY}?action=interessado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('interessado ' + r.status);
  return r.json();
}
