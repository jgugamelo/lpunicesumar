fetch("http://localhost:3000/api/uc?action=preco&idCurso=EGRAD_BIO&idPolo=3282").then(r => r.json()).then(data => { console.log(JSON.stringify(data, null, 2)); });
