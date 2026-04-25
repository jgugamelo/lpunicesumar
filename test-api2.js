fetch("http://localhost:3000/api/uc?action=cursoConteudo&idCurso=EGRAD_BIO").then(r => r.json()).then(data => { console.log(JSON.stringify(data.curso, null, 2)); });
