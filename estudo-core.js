// Regras compartilhadas entre Hoje, Banco, Simulado e o painel Rumo à vaga.
(function () {
  var ALIAS = {
    'português': 'Língua Portuguesa', 'língua portuguesa': 'Língua Portuguesa',
    'constitucional': 'Direito Constitucional', 'direito constitucional': 'Direito Constitucional',
    'processo civil': 'Direito Processual Civil', 'direito processual civil': 'Direito Processual Civil',
    'penal': 'Direito Penal', 'direito penal': 'Direito Penal',
    'processo penal': 'Direito Processual Penal', 'direito processual penal': 'Direito Processual Penal',
    'administrativo': 'Direito Administrativo', 'direito administrativo': 'Direito Administrativo',
    'normas da corregedoria': 'Normas da Corregedoria', 'normas cgj': 'Normas da Corregedoria',
    'informática': 'Informática', 'raciocínio lógico': 'Raciocínio Lógico', 'matemática': 'Matemática',
    'atualidades': 'Atualidades', 'estatuto pcd': 'Estatuto da Pessoa com Deficiência',
    'estatuto da pessoa com deficiência': 'Estatuto da Pessoa com Deficiência'
  };

  // Nome de matéria do plano (ex.: "Revisão · Processo Civil") → disciplina do banco.
  function disciplinaDoBanco(nome) {
    var n = String(nome || '').replace(/^(Revisão|Reta Final)\s*·\s*/i, '').trim().toLowerCase();
    return ALIAS[n] || null;
  }

  // Matéria que as aulas não cobrem a fundo: Atualidades depende do noticiário dos últimos meses.
  var EXTRAS = ['Atualidades'];
  var INICIO_EXTRAS = new Date(2026, 9, 19);

  function extraDaSemana(data) {
    var d = data || ((typeof getCurrentDate === 'function') ? getCurrentDate() : new Date());
    var dia = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var semanas = Math.floor((dia - INICIO_EXTRAS) / (7 * 86400000));
    var i = ((semanas % EXTRAS.length) + EXTRAS.length) % EXTRAS.length;
    return EXTRAS[i];
  }

  function linkBanco(disciplina, situacao) {
    return 'banco-questoes.html?disciplina=' + encodeURIComponent(disciplina) +
      (situacao ? '&situacao=' + encodeURIComponent(situacao) : '');
  }

  // Média de questões por disciplina nas provas a partir do exame `desde`.
  function pesosRecentes(banco, desde) {
    var porExame = {}, soma = {};
    banco.forEach(function (q) {
      if (q.exam_number < (desde || 41)) return;
      porExame[q.exam_number] = 1;
      soma[q.discipline] = (soma[q.discipline] || 0) + 1;
    });
    var n = Object.keys(porExame).length || 1, pesos = {};
    Object.keys(soma).forEach(function (d) { pesos[d] = soma[d] / n; });
    return pesos;
  }

  function lerRespostas() {
    try { return JSON.parse(localStorage.getItem('tj_bq_respostas')) || {}; } catch (e) { return {}; }
  }

  // Por disciplina: questões no banco, respondidas e acertadas (última resposta).
  function statsPorDisciplina(banco, respostas) {
    var r = respostas || lerRespostas(), s = {};
    banco.forEach(function (q) {
      var d = s[q.discipline] || (s[q.discipline] = { total: 0, n: 0, ac: 0 });
      d.total++;
      var x = r[q.id];
      if (x && x.vezes) { d.n++; if (x.ultima_correta) d.ac++; }
    });
    return s;
  }

  // Puxa para 50% quando há poucas respostas, para não tirar conclusão de 2 questões.
  function acertoEstimado(st) {
    st = st || { n: 0, ac: 0 };
    return (st.ac + 2) / (st.n + 4);
  }

  window.ESTUDO = {
    disciplinaDoBanco: disciplinaDoBanco, EXTRAS: EXTRAS, extraDaSemana: extraDaSemana,
    linkBanco: linkBanco, pesosRecentes: pesosRecentes, lerRespostas: lerRespostas,
    statsPorDisciplina: statsPorDisciplina, acertoEstimado: acertoEstimado
  };
})();
