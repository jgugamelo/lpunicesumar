fetch("http://localhost:3000/api/uc?action=cursos").then(r => r.json()).then(data => { const biomed = data.filter(c => c.nmCurso.toLowerCase().includes("biomedicina")); console.log(biomed[0]); });
