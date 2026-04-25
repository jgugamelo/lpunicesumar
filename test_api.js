import fetch from 'node-fetch';

const clientId = "87063467-333e-3243-92f7-66cdd60d1ba9";
const clientSecret = "c89b70fe-e27c-3d23-ab3f-911be24754c5";
const hash = Buffer.from(clientId + ':' + clientSecret).toString('base64');
const TA = 'Basic ' + hash;

async function run() {
  const rauth = await fetch("https://api-leads.unicesumar.edu.br/cap/v1/oauth2/token", {
    method: 'POST',
    headers: {
      'Authorization': TA,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const oauth = await rauth.json();
  const tok = oauth.access_token;
  console.log("Token:", !!tok);

  const rAll = await fetch("https://api-leads.unicesumar.edu.br/cap/v1/curso?idPais=90", {
    headers: { 'Authorization': 'Bearer ' + tok }
  });
  const all = await rAll.json();
  console.log("Total courses:", all.length);
  
  const epos = all.filter(c => c.idCurso.startsWith('EPOS_')).slice(0, 3);
  const epro = all.filter(c => c.idCurso.startsWith('EPRF_') || c.idCurso.startsWith('EPRO_')).slice(0, 3);
  
  console.log("EPOS samples:", epos.map(c => c.idCurso));
  console.log("EPRO samples:", epro.map(c => c.idCurso));
  
  if (epos.length > 0) {
    const c = epos[0];
    const rC = await fetch("https://api-leads.unicesumar.edu.br/cap/v1/curso/" + encodeURIComponent(c.idCurso), {
      headers: { 'Authorization': 'Bearer ' + tok }
    });
    console.log("TESTING EPOS_:", c.idCurso, "-> Status:", rC.status);
    const cData = await rC.text();
    console.log("Response:", cData.substring(0, 200));
  }
}

run().catch(console.error);
