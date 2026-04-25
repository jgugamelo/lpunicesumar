fetch("http://localhost:3000/api/uc?action=polos&idCurso=EGRAD_BIO&idEstado=19").then(r=>r.json()).then(p=>console.log(p.slice(0,2)));
