// ===== FITTRACK - LÓGICA PRINCIPAL =====
// Dados guardados no localStorage do browser. Cada utilizador tem o seu próprio namespace.

// ========================================================================
// ===== TEMA (DARK / LIGHT MODE) =====
// ========================================================================
function initTema() {
    const tema = localStorage.getItem('fittrack_tema') || 'dark';
    document.body.classList.toggle('light-mode', tema === 'light');
    _atualizarBtnTema();
}

function toggleTema() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('fittrack_tema', isLight ? 'light' : 'dark');
    _atualizarBtnTema();
}

function _atualizarBtnTema() {
    const isLight = document.body.classList.contains('light-mode');
    // Label no drawer
    const label = document.getElementById('tema-label');
    if (label) label.textContent = isLight ? 'Mudar para modo escuro' : 'Mudar para modo claro';
    // Ícone/título nos botões simples (sem filhos de texto)
    document.querySelectorAll('.btn-tema').forEach(btn => {
        btn.title = isLight ? 'Mudar para modo escuro' : 'Mudar para modo claro';
        // Só atualiza textContent se for um botão simples (sem span filho)
        if (!btn.querySelector('span')) {
            btn.textContent = isLight ? '🌙' : '☀️';
        }
    });
}

initTema(); // aplica tema antes de qualquer outra coisa

// ========================================================================
// ===== MENU HAMBURGER (MOBILE) =====
// ========================================================================
function toggleMenu() {
    const nav = document.getElementById('nav-links');
    const btn = document.getElementById('hamburger');
    if (nav) nav.classList.toggle('aberto');
    if (btn) btn.classList.toggle('ativo');
}

// Fechar menu ao clicar num link
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            const nav = document.getElementById('nav-links');
            const btn = document.getElementById('hamburger');
            if (nav) nav.classList.remove('aberto');
            if (btn) btn.classList.remove('ativo');
        });
    });
});

// Fechar menu ao clicar fora
document.addEventListener('click', (e) => {
    const nav = document.getElementById('nav-links');
    const btn = document.getElementById('hamburger');
    if (!nav || !nav.classList.contains('aberto')) return;
    if (!nav.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
        nav.classList.remove('aberto');
        btn?.classList.remove('ativo');
    }
});

// ===== AUTH (contas locais) =====
// NOTA: isto é um login "local" — os dados ficam no browser, não num servidor.
// Serve para separar perfis no mesmo computador.
const Auth = {
    usuarios() {
        return JSON.parse(localStorage.getItem('fittrack_users') || '{}');
    },
    async hash(senha) {
        const enc = new TextEncoder().encode(senha);
        const buf = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    },
    async registar(nome, senha) {
        const users = this.usuarios();
        if (users[nome]) throw new Error('Esse nome de utilizador já existe');
        users[nome] = { hash: await this.hash(senha), criadoEm: new Date().toISOString() };
        localStorage.setItem('fittrack_users', JSON.stringify(users));
        localStorage.setItem('fittrack_currentUser', nome);
        // Se é o primeiro utilizador, migra dados antigos não prefixados
        if (Object.keys(users).length === 1) Auth.migrarDadosAntigos(nome);
    },
    async login(nome, senha) {
        const users = this.usuarios();
        if (!users[nome]) throw new Error('Utilizador não existe');
        const h = await this.hash(senha);
        if (users[nome].hash !== h) throw new Error('Password incorreta');
        localStorage.setItem('fittrack_currentUser', nome);
    },
    logout() {
        localStorage.removeItem('fittrack_currentUser');
        window.location.href = 'login.html';
    },
    actual() {
        return localStorage.getItem('fittrack_currentUser');
    },
    migrarDadosAntigos(nome) {
        const chaves = ['refeicoes','pesos','perfil','objetivoCalorias','alimentosCustom','favoritas','agua','diario','objetivoAguaML'];
        chaves.forEach(k => {
            const antiga = localStorage.getItem('fittrack_' + k);
            const nova = localStorage.getItem(`fittrack_${nome}_${k}`);
            if (antiga && !nova) {
                localStorage.setItem(`fittrack_${nome}_${k}`, antiga);
                localStorage.removeItem('fittrack_' + k);
            }
        });
    }
};

// Guarda: redireciona para login se não estiver autenticado (exceto na própria página de login)
(function verificarLogin() {
    const pag = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (pag === 'login.html') return;
    if (!Auth.actual()) window.location.href = 'login.html';
})();

// ===== HELPER DE ARMAZENAMENTO (por utilizador) =====
const Storage = {
    _prefix() {
        const user = localStorage.getItem('fittrack_currentUser');
        return user ? `fittrack_${user}_` : 'fittrack_';
    },
    salvar(chave, dados) {
        localStorage.setItem(this._prefix() + chave, JSON.stringify(dados));
    },
    carregar(chave, padrao = null) {
        const dados = localStorage.getItem(this._prefix() + chave);
        return dados ? JSON.parse(dados) : padrao;
    },
    remover(chave) {
        localStorage.removeItem(this._prefix() + chave);
    }
};

// ===== ESTADO GLOBAL =====
let refeicoes        = Storage.carregar('refeicoes', []);
let registos         = Storage.carregar('pesos', []);
let perfilMacros     = Storage.carregar('perfil', null);
let objetivoCalorias = Storage.carregar('objetivoCalorias', 2500);
let alimentosCustom  = Storage.carregar('alimentosCustom', []);
let favoritas        = Storage.carregar('favoritas', []);
let agua             = Storage.carregar('agua', {});   // { "2026-04-23": 1500 }  em ml
let diario           = Storage.carregar('diario', {}); // { "2026-04-23": {sono, energia, notas} }
let objetivoAguaML   = Storage.carregar('objetivoAguaML', 2000);

// Migração: se dados antigos estavam em copos (números pequenos), converter para ml
(function migrarAgua() {
    let mudou = false;
    for (const [d, val] of Object.entries(agua)) {
        if (typeof val === 'number' && val > 0 && val < 50) {
            agua[d] = val * 250; mudou = true;
        }
    }
    if (mudou) Storage.salvar('agua', agua);
})();

let TODOS_ALIMENTOS = [];
function recarregarAlimentos() {
    TODOS_ALIMENTOS = [...ALIMENTOS, ...alimentosCustom.map(a => ({...a, _custom: true}))];
}
if (typeof ALIMENTOS !== 'undefined') recarregarAlimentos();

// ===== UTILITÁRIOS DE DATA =====
function dataHoje() {
    return new Date().toISOString().split('T')[0];
}
function formatarData(dataStr) {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}
function diasEntre(d1, d2) {
    const ms = Math.abs(new Date(d2) - new Date(d1));
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}
function formatarTipo(tipo) {
    const nomes = {
        'pequeno-almoco': 'Pequeno-almoço',
        'almoco': 'Almoço', 'lanche': 'Lanche',
        'jantar': 'Jantar', 'ceia': 'Ceia'
    };
    return nomes[tipo] || tipo;
}

// ========================================================================
// ===== PÁGINA DIETA =====
// ========================================================================
const btnLista    = document.getElementById('modo-lista-btn');
const btnComposta = document.getElementById('modo-composta-btn');
const btnManual   = document.getElementById('modo-manual-btn');
const btnFoto     = document.getElementById('modo-foto-btn');
const formLista   = document.getElementById('form-lista');
const formComposta = document.getElementById('form-composta');
const formManual  = document.getElementById('form-refeicao');
const formFoto    = document.getElementById('form-foto');

function ativarModo(modo) {
    [btnLista, btnComposta, btnManual, btnFoto].forEach(b => b && b.classList.remove('ativo'));
    if (formLista)    formLista.style.display    = 'none';
    if (formComposta) formComposta.style.display = 'none';
    if (formManual)   formManual.style.display   = 'none';
    if (formFoto)     formFoto.style.display     = 'none';
    if (modo === 'lista')    { btnLista    && btnLista.classList.add('ativo');    formLista    && (formLista.style.display    = 'grid'); }
    if (modo === 'composta') { btnComposta && btnComposta.classList.add('ativo'); formComposta && (formComposta.style.display = 'grid'); }
    if (modo === 'manual')   { btnManual   && btnManual.classList.add('ativo');   formManual   && (formManual.style.display   = 'grid'); }
    if (modo === 'foto')     { btnFoto     && btnFoto.classList.add('ativo');     formFoto     && (formFoto.style.display     = 'block'); }
}
if (btnLista)    btnLista.addEventListener('click', () => ativarModo('lista'));
if (btnComposta) btnComposta.addEventListener('click', () => ativarModo('composta'));
if (btnManual)   btnManual.addEventListener('click', () => ativarModo('manual'));
if (btnFoto)     btnFoto.addEventListener('click', () => ativarModo('foto'));

// ===== COMBOBOX PESQUISÁVEL (alimento na lista) =====
const selectAlimento = document.getElementById('alimento-lista'); // hidden input agora
const inputBusca     = document.getElementById('alimento-busca');
const comboLista     = document.getElementById('combobox-lista');

function renderComboboxLista(filtro = '') {
    if (!comboLista) return;
    const termo = filtro.trim().toLowerCase();
    const filtrados = TODOS_ALIMENTOS
        .map((a, i) => ({ a, i }))
        .filter(x => x.a.nome.toLowerCase().includes(termo));
    if (filtrados.length === 0) {
        comboLista.innerHTML = `<div class="combobox-vazio">Nenhum alimento encontrado</div>`;
        return;
    }
    const selecionadoIdx = selectAlimento ? selectAlimento.value : '';
    comboLista.innerHTML = filtrados.map(x => `
        <div class="combobox-opcao ${String(x.i) === selecionadoIdx ? 'selecionado' : ''}" data-idx="${x.i}">
            ${x.a.nome}${x.a._custom ? '<small>(teu)</small>' : ''}
        </div>
    `).join('');
    comboLista.querySelectorAll('.combobox-opcao').forEach(el => {
        el.addEventListener('click', () => {
            const idx = el.dataset.idx;
            selectAlimento.value = idx;
            comboLista.querySelectorAll('.combobox-opcao').forEach(o => o.classList.remove('selecionado'));
            el.classList.add('selecionado');
            atualizarPreview();
        });
    });
}

function popularDropdownAlimentos() {
    renderComboboxLista(inputBusca ? inputBusca.value : '');
}
popularDropdownAlimentos();

if (inputBusca) {
    inputBusca.addEventListener('input', () => renderComboboxLista(inputBusca.value));
}

// Preview de macros
const inputQtd = document.getElementById('quantidade');
const previewBox = document.getElementById('preview-macros');
function atualizarPreview() {
    if (!selectAlimento || !inputQtd || !previewBox) return;
    const idx = selectAlimento.value;
    const qtd = parseFloat(inputQtd.value);
    if (idx === '' || !qtd || qtd <= 0) { previewBox.style.display = 'none'; return; }
    const alimento = TODOS_ALIMENTOS[idx];
    const fator = qtd / 100;
    document.getElementById('prev-cal').textContent = (alimento.cal * fator).toFixed(0);
    document.getElementById('prev-p').textContent   = (alimento.p   * fator).toFixed(1);
    document.getElementById('prev-h').textContent   = (alimento.h   * fator).toFixed(1);
    document.getElementById('prev-g').textContent   = (alimento.g   * fator).toFixed(1);
    previewBox.style.display = 'block';
}
if (inputQtd) inputQtd.addEventListener('input', atualizarPreview);

const inputDataRefeicao       = document.getElementById('data-refeicao');
const inputDataRefeicaoManual = document.getElementById('data-refeicao-manual');
if (inputDataRefeicao)       inputDataRefeicao.value = dataHoje();
if (inputDataRefeicaoManual) inputDataRefeicaoManual.value = dataHoje();

// Submissão modo lista
if (formLista) {
    formLista.addEventListener('submit', (e) => {
        e.preventDefault();
        const idx = selectAlimento ? selectAlimento.value : '';
        const qtd = parseFloat(inputQtd.value);
        if (idx === '' || !qtd) { alert('Escolhe um alimento da lista e indica a quantidade.'); return; }
        const alimento = TODOS_ALIMENTOS[idx];
        const fator = qtd / 100;
        refeicoes.push({
            data: inputDataRefeicao ? inputDataRefeicao.value : dataHoje(),
            tipo: document.getElementById('tipo-refeicao-lista').value,
            nome: alimento.nome,
            quantidade: qtd,
            calorias: +(alimento.cal * fator).toFixed(0),
            proteina: +(alimento.p   * fator).toFixed(1),
            hidratos: +(alimento.h   * fator).toFixed(1),
            gordura:  +(alimento.g   * fator).toFixed(1)
        });
        Storage.salvar('refeicoes', refeicoes);
        atualizarDieta();
        formLista.reset();
        if (inputDataRefeicao) inputDataRefeicao.value = dataHoje();
        if (selectAlimento) selectAlimento.value = '';
        if (inputBusca) inputBusca.value = '';
        renderComboboxLista('');
        previewBox.style.display = 'none';
    });
}

// ========================================================================
// ===== REFEIÇÃO COMPOSTA (vários ingredientes) =====
// ========================================================================
const inputDataComposta = document.getElementById('data-refeicao-composta');
if (inputDataComposta) inputDataComposta.value = dataHoje();

let ingredientesAtuais = []; // cada item: { idxAlimento: '', qtd: null, buscaTexto: '' }

function adicionarIngredienteRow() {
    ingredientesAtuais.push({ idxAlimento: '', qtd: null, buscaTexto: '' });
    renderIngredientes();
}

function removerIngredienteRow(i) {
    ingredientesAtuais.splice(i, 1);
    renderIngredientes();
}

function renderIngredientes() {
    const container = document.getElementById('ingredientes-lista');
    if (!container) return;
    if (ingredientesAtuais.length === 0) {
        container.innerHTML = `<p class="subtitulo" style="font-size:0.9rem;">Ainda não adicionaste ingredientes. Clica em "+ Adicionar ingrediente".</p>`;
        atualizarPreviewComposta();
        return;
    }
    container.innerHTML = ingredientesAtuais.map((ing, i) => `
        <div class="ingrediente-row">
            <div>
                <label>Alimento</label>
                <div class="combobox">
                    <input type="text" class="combobox-input" data-ing-busca="${i}" placeholder="Pesquisar..." value="${ing.buscaTexto || ''}" autocomplete="off">
                    <div class="combobox-lista" data-ing-lista="${i}"></div>
                </div>
            </div>
            <div>
                <label>Quantidade (g)</label>
                <input type="number" min="1" step="1" data-ing-qtd="${i}" value="${ing.qtd || ''}" placeholder="Ex: 100">
            </div>
            <button type="button" class="ingrediente-remover" onclick="removerIngredienteRow(${i})">Remover</button>
        </div>
    `).join('');

    // listeners para cada linha
    ingredientesAtuais.forEach((ing, i) => {
        const inputBuscaIng = container.querySelector(`[data-ing-busca="${i}"]`);
        const listaIng      = container.querySelector(`[data-ing-lista="${i}"]`);
        const inputQtdIng   = container.querySelector(`[data-ing-qtd="${i}"]`);

        function renderListaIng(filtro = '') {
            const termo = filtro.trim().toLowerCase();
            const filtrados = TODOS_ALIMENTOS.map((a, k) => ({ a, k })).filter(x => x.a.nome.toLowerCase().includes(termo));
            if (filtrados.length === 0) {
                listaIng.innerHTML = `<div class="combobox-vazio">Sem resultados</div>`;
                return;
            }
            listaIng.innerHTML = filtrados.map(x => `
                <div class="combobox-opcao ${String(x.k) === String(ing.idxAlimento) ? 'selecionado' : ''}" data-k="${x.k}">
                    ${x.a.nome}${x.a._custom ? '<small>(teu)</small>' : ''}
                </div>
            `).join('');
            listaIng.querySelectorAll('.combobox-opcao').forEach(el => {
                el.addEventListener('click', () => {
                    ing.idxAlimento = el.dataset.k;
                    ing.buscaTexto = TODOS_ALIMENTOS[ing.idxAlimento].nome;
                    inputBuscaIng.value = ing.buscaTexto;
                    listaIng.querySelectorAll('.combobox-opcao').forEach(o => o.classList.remove('selecionado'));
                    el.classList.add('selecionado');
                    atualizarPreviewComposta();
                });
            });
        }
        renderListaIng(ing.buscaTexto || '');

        inputBuscaIng.addEventListener('input', () => {
            ing.buscaTexto = inputBuscaIng.value;
            renderListaIng(inputBuscaIng.value);
        });
        inputQtdIng.addEventListener('input', () => {
            ing.qtd = parseFloat(inputQtdIng.value) || null;
            atualizarPreviewComposta();
        });
    });

    atualizarPreviewComposta();
}

function calcularTotaisComposta() {
    let cal = 0, p = 0, h = 0, g = 0;
    const detalhes = [];
    ingredientesAtuais.forEach(ing => {
        if (ing.idxAlimento === '' || !ing.qtd) return;
        const a = TODOS_ALIMENTOS[ing.idxAlimento];
        if (!a) return;
        const fator = ing.qtd / 100;
        const iCal = a.cal * fator, iP = a.p * fator, iH = a.h * fator, iG = a.g * fator;
        cal += iCal; p += iP; h += iH; g += iG;
        detalhes.push({
            nome: a.nome, qtd: ing.qtd,
            calorias: +iCal.toFixed(0), proteina: +iP.toFixed(1),
            hidratos: +iH.toFixed(1), gordura: +iG.toFixed(1)
        });
    });
    return { cal, p, h, g, detalhes };
}

function atualizarPreviewComposta() {
    const preview = document.getElementById('preview-composta');
    if (!preview) return;
    const totais = calcularTotaisComposta();
    if (totais.detalhes.length === 0) { preview.style.display = 'none'; return; }
    document.getElementById('comp-cal').textContent = totais.cal.toFixed(0);
    document.getElementById('comp-p').textContent   = totais.p.toFixed(1);
    document.getElementById('comp-h').textContent   = totais.h.toFixed(1);
    document.getElementById('comp-g').textContent   = totais.g.toFixed(1);
    preview.style.display = 'block';
}

if (formComposta) {
    formComposta.addEventListener('submit', (e) => {
        e.preventDefault();
        const totais = calcularTotaisComposta();
        if (totais.detalhes.length === 0) { alert('Adiciona pelo menos um ingrediente válido (com alimento e quantidade).'); return; }
        refeicoes.push({
            data: inputDataComposta.value,
            tipo: document.getElementById('tipo-refeicao-composta').value,
            nome: document.getElementById('nome-composta').value,
            quantidade: null,
            calorias: +totais.cal.toFixed(0),
            proteina: +totais.p.toFixed(1),
            hidratos: +totais.h.toFixed(1),
            gordura:  +totais.g.toFixed(1),
            composta: true,
            ingredientes: totais.detalhes
        });
        Storage.salvar('refeicoes', refeicoes);
        atualizarDieta();
        formComposta.reset();
        inputDataComposta.value = dataHoje();
        ingredientesAtuais = [];
        renderIngredientes();
    });
    renderIngredientes();
}

// Submissão modo manual
if (formManual) {
    formManual.addEventListener('submit', (e) => {
        e.preventDefault();
        refeicoes.push({
            data: inputDataRefeicaoManual ? inputDataRefeicaoManual.value : dataHoje(),
            tipo: document.getElementById('tipo-refeicao').value,
            nome: document.getElementById('nome-alimento').value,
            quantidade: null,
            calorias: parseFloat(document.getElementById('calorias').value),
            proteina: parseFloat(document.getElementById('proteina').value),
            hidratos: parseFloat(document.getElementById('hidratos').value),
            gordura:  parseFloat(document.getElementById('gordura').value)
        });
        Storage.salvar('refeicoes', refeicoes);
        atualizarDieta();
        formManual.reset();
        if (inputDataRefeicaoManual) inputDataRefeicaoManual.value = dataHoje();
    });
}

// Resumo + tabela de hoje + histórico
function atualizarDieta() {
    const tbody = document.getElementById('tabela-refeicoes');
    if (!tbody) return;

    const hoje = dataHoje();
    const refeicoesHoje = refeicoes.filter(r => r.data === hoje);

    let totCal = 0, totP = 0, totH = 0, totG = 0;
    refeicoesHoje.forEach(r => { totCal += r.calorias; totP += r.proteina; totH += r.hidratos; totG += r.gordura; });

    document.getElementById('total-calorias').textContent = totCal.toFixed(0);
    document.getElementById('total-proteina').textContent = totP.toFixed(1) + 'g';
    document.getElementById('total-hidratos').textContent = totH.toFixed(1) + 'g';
    document.getElementById('total-gordura').textContent  = totG.toFixed(1) + 'g';
    const elObj = document.getElementById('objetivo-cal-display');
    if (elObj) elObj.textContent = objetivoCalorias;
    document.getElementById('barra-calorias').style.width = Math.min((totCal / objetivoCalorias) * 100, 100) + '%';

    if (refeicoesHoje.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--cor-texto-claro);">
                           Ainda não adicionaste refeições hoje</td></tr>`;
    } else {
        tbody.innerHTML = refeicoesHoje.map((r) => {
            const idxReal = refeicoes.indexOf(r);
            const qtdTexto = r.quantidade ? r.quantidade + 'g' : (r.composta ? 'composta' : '—');
            const ingsHtml = (r.composta && r.ingredientes && r.ingredientes.length)
                ? `<div style="font-size:0.8rem; color:var(--cor-texto-claro); margin-top:0.2rem;">${r.ingredientes.map(ing => `${ing.nome} (${ing.qtd}g)`).join(' + ')}</div>`
                : '';
            return `
            <tr>
                <td>${formatarTipo(r.tipo)}</td>
                <td>${r.nome}${ingsHtml}</td>
                <td>${qtdTexto}</td>
                <td>${r.calorias} kcal</td>
                <td>${r.proteina}g</td>
                <td>${r.hidratos}g</td>
                <td>${r.gordura}g</td>
                <td><button class="btn-icon" title="Adicionar às favoritas" onclick="adicionarFavorita(${idxReal})">★</button></td>
                <td><button class="btn btn-perigo" onclick="removerRefeicao(${idxReal})">Remover</button></td>
            </tr>`;
        }).join('');
    }
    atualizarHistorico();
    atualizarFavoritas();
}

// Histórico de 2 semanas
function atualizarHistorico() {
    const container = document.getElementById('historico-container');
    if (!container) return;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const limite = new Date(hoje); limite.setDate(limite.getDate() - 14);

    const recentes = refeicoes.filter(r => {
        const d = new Date(r.data);
        return d >= limite && d <= hoje;
    });

    if (recentes.length === 0) {
        container.innerHTML = `<p style="color:var(--cor-texto-claro); text-align:center; padding:1rem;">
                               Ainda não tens histórico. Começa a registar refeições para ver o progresso.</p>`;
        return;
    }

    const porData = {};
    recentes.forEach(r => { if (!porData[r.data]) porData[r.data] = []; porData[r.data].push(r); });
    const datasOrdenadas = Object.keys(porData).sort((a, b) => new Date(b) - new Date(a));

    container.innerHTML = datasOrdenadas.map(data => {
        const refs = porData[data];
        let cal = 0, p = 0, h = 0, g = 0;
        refs.forEach(r => { cal += r.calorias; p += r.proteina; h += r.hidratos; g += r.gordura; });
        const dif = diasEntre(data, dataHoje());
        const etiqueta = dif === 0 ? 'Hoje' : (dif === 1 ? 'Ontem' : `Há ${dif} dias`);
        return `
        <div class="dia-historico">
            <div class="dia-cabecalho">
                <div>
                    <strong>${formatarData(data)}</strong>
                    <span class="etiqueta-dia">${etiqueta}</span>
                </div>
                <div class="dia-totais">
                    <span><strong>${cal.toFixed(0)}</strong> kcal</span>
                    <span style="color:var(--cor-proteina);">${p.toFixed(0)}g P</span>
                    <span style="color:var(--cor-hidratos);">${h.toFixed(0)}g H</span>
                    <span style="color:var(--cor-gordura);">${g.toFixed(0)}g G</span>
                    ${dif > 0 ? `<button class="btn btn-secundario" style="padding:0.3rem 0.7rem; font-size:0.8rem;" onclick="copiarDia('${data}')">Copiar para hoje</button>` : ''}
                </div>
            </div>
            <ul class="lista-refeicoes-dia">
                ${refs.map(r => `
                    <li>
                        <span class="ref-tipo">${formatarTipo(r.tipo)}</span>
                        <span class="ref-nome">${r.nome}${r.quantidade ? ` (${r.quantidade}g)` : ''}</span>
                        <span class="ref-cal">${r.calorias} kcal</span>
                    </li>`).join('')}
            </ul>
        </div>`;
    }).join('');
}

function removerRefeicao(index) {
    refeicoes.splice(index, 1);
    Storage.salvar('refeicoes', refeicoes);
    atualizarDieta();
}

// ===== FAVORITAS =====
function adicionarFavorita(idxRefeicao) {
    const r = refeicoes[idxRefeicao];
    if (!r) return;
    // evitar duplicados
    const existe = favoritas.find(f => f.nome === r.nome && f.quantidade === r.quantidade);
    if (existe) { alert('Já está nas favoritas!'); return; }
    favoritas.push({
        nome: r.nome, quantidade: r.quantidade,
        tipo: r.tipo, calorias: r.calorias,
        proteina: r.proteina, hidratos: r.hidratos, gordura: r.gordura,
        composta: !!r.composta, ingredientes: r.ingredientes || null
    });
    Storage.salvar('favoritas', favoritas);
    atualizarFavoritas();
}

function atualizarFavoritas() {
    const container = document.getElementById('favoritas-container');
    if (!container) return;
    if (favoritas.length === 0) {
        container.innerHTML = `<p style="color:var(--cor-texto-claro); font-size:0.9rem;">
                               Ainda não tens favoritas. Clica na estrela ★ de uma refeição para a guardar.</p>`;
        return;
    }
    container.innerHTML = favoritas.map((f, i) => {
        const ingsHtml = (f.composta && f.ingredientes && f.ingredientes.length)
            ? `<div style="font-size:0.8rem; color:var(--cor-texto-claro); margin-top:0.2rem;">${f.ingredientes.map(ing => `${ing.nome} (${ing.qtd}g)`).join(' + ')}</div>`
            : '';
        return `
        <div class="favorita-item">
            <div class="favorita-info">
                <strong>${f.nome}</strong>${f.quantidade ? ` <span style="color:var(--cor-texto-claro);">${f.quantidade}g</span>` : ''}
                ${ingsHtml}
                <div style="font-size:0.85rem; color:var(--cor-texto-claro);">
                    ${f.calorias} kcal · ${f.proteina}g P · ${f.hidratos}g H · ${f.gordura}g G
                </div>
            </div>
            <div class="favorita-acoes">
                <button class="btn btn-primario" style="padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="adicionarDeFavorita(${i})">+ Hoje</button>
                <button class="btn btn-perigo" onclick="removerFavorita(${i})">✕</button>
            </div>
        </div>`;
    }).join('');
}

function adicionarDeFavorita(i) {
    const f = favoritas[i];
    if (!f) return;
    refeicoes.push({
        data: dataHoje(), tipo: f.tipo, nome: f.nome, quantidade: f.quantidade,
        calorias: f.calorias, proteina: f.proteina, hidratos: f.hidratos, gordura: f.gordura,
        composta: !!f.composta, ingredientes: f.ingredientes || null
    });
    Storage.salvar('refeicoes', refeicoes);
    atualizarDieta();
}

function removerFavorita(i) {
    favoritas.splice(i, 1);
    Storage.salvar('favoritas', favoritas);
    atualizarFavoritas();
}

// ===== COPIAR DIA =====
function copiarDia(data) {
    const refsDoDia = refeicoes.filter(r => r.data === data);
    if (refsDoDia.length === 0) return;
    if (!confirm(`Copiar ${refsDoDia.length} refeição(ões) de ${formatarData(data)} para hoje?`)) return;
    refsDoDia.forEach(r => {
        refeicoes.push({ ...r, data: dataHoje() });
    });
    Storage.salvar('refeicoes', refeicoes);
    atualizarDieta();
}

// ===== ALIMENTOS PERSONALIZADOS =====
const formAlimentoCustom = document.getElementById('form-alimento-custom');
if (formAlimentoCustom) {
    formAlimentoCustom.addEventListener('submit', (e) => {
        e.preventDefault();
        alimentosCustom.push({
            nome: document.getElementById('custom-nome').value,
            cal: parseFloat(document.getElementById('custom-cal').value),
            p:   parseFloat(document.getElementById('custom-p').value),
            h:   parseFloat(document.getElementById('custom-h').value),
            g:   parseFloat(document.getElementById('custom-g').value)
        });
        Storage.salvar('alimentosCustom', alimentosCustom);
        recarregarAlimentos();
        popularDropdownAlimentos();
        atualizarListaCustom();
        formAlimentoCustom.reset();
    });
    atualizarListaCustom();
}

function atualizarListaCustom() {
    const container = document.getElementById('lista-custom');
    if (!container) return;
    if (alimentosCustom.length === 0) {
        container.innerHTML = `<p style="color:var(--cor-texto-claro); font-size:0.9rem;">Ainda não criaste alimentos personalizados.</p>`;
        return;
    }
    container.innerHTML = alimentosCustom.map((a, i) => `
        <div class="custom-item">
            <div><strong>${a.nome}</strong>
                <div style="font-size:0.85rem; color:var(--cor-texto-claro);">
                    Por 100g: ${a.cal} kcal · ${a.p}g P · ${a.h}g H · ${a.g}g G
                </div>
            </div>
            <button class="btn btn-perigo" onclick="removerAlimentoCustom(${i})">Remover</button>
        </div>`).join('');
}

function removerAlimentoCustom(i) {
    alimentosCustom.splice(i, 1);
    Storage.salvar('alimentosCustom', alimentosCustom);
    recarregarAlimentos();
    popularDropdownAlimentos();
    atualizarListaCustom();
}

if (document.getElementById('tabela-refeicoes')) atualizarDieta();

// ========================================================================
// ===== FOTO DA COMIDA (GEMINI AI) =====
// ========================================================================
let fotoBase64 = null;
let fotoModoAtual = 'comida'; // 'comida' ou 'rotulo'

function mudarFotoModo(modo) {
    fotoModoAtual = modo;
    const btnComida = document.getElementById('foto-comida-btn');
    const btnRotulo = document.getElementById('foto-rotulo-btn');
    if (btnComida) btnComida.classList.toggle('ativo', modo === 'comida');
    if (btnRotulo) btnRotulo.classList.toggle('ativo', modo === 'rotulo');
    const instrucao = document.getElementById('foto-instrucao');
    if (instrucao) {
        instrucao.textContent = modo === 'rotulo'
            ? 'Tira foto ao rótulo / tabela nutricional do produto. O FitTrack lê os valores automaticamente.'
            : 'Tira foto à comida e o FitTrack tenta identificar o alimento e os seus macros aproximados.';
    }
    // Reset
    const previewContainer = document.getElementById('foto-preview-container');
    const btnAnalisar = document.getElementById('btn-analisar');
    const resultado = document.getElementById('foto-resultado');
    if (previewContainer) previewContainer.style.display = 'none';
    if (btnAnalisar) btnAnalisar.style.display = 'none';
    if (resultado) resultado.style.display = 'none';
    ['foto-input','foto-camera','foto-galeria'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    fotoBase64 = null;
}

function verificarApiKeyGemini() {
    const key = localStorage.getItem('fittrack_gemini_key');
    const secaoKey = document.getElementById('secao-api-key');
    if (secaoKey) secaoKey.style.display = key ? 'none' : 'block';
    return !!key;
}

function guardarChaveGemini() {
    const input = document.getElementById('gemini-key-input');
    if (!input || !input.value.trim()) { alert('Cola a chave API no campo.'); return; }
    localStorage.setItem('fittrack_gemini_key', input.value.trim());
    verificarApiKeyGemini();
    alert('✅ Chave guardada! Agora podes usar a função de foto.');
}

function removerChaveGemini() {
    if (!confirm('Remover a chave API Gemini guardada?')) return;
    localStorage.removeItem('fittrack_gemini_key');
    verificarApiKeyGemini();
}

// Inicializar secção de foto
const fotoInput = document.getElementById('foto-input');

function handleFotoSelecionada(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else       { w = Math.round(w * MAX / h); h = MAX; }
            }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            fotoBase64 = dataUrl.split(',')[1];

            const preview = document.getElementById('foto-preview');
            const container = document.getElementById('foto-preview-container');
            if (preview) preview.src = dataUrl;
            if (container) container.style.display = 'block';

            const btnAnalisar = document.getElementById('btn-analisar');
            if (btnAnalisar) btnAnalisar.style.display = 'block';

            const resultado = document.getElementById('foto-resultado');
            if (resultado) resultado.style.display = 'none';
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

if (document.getElementById('foto-camera') || document.getElementById('foto-galeria')) {
    verificarApiKeyGemini();
    const fotoCamera = document.getElementById('foto-camera');
    const fotoGaleria = document.getElementById('foto-galeria');
    if (fotoCamera) fotoCamera.addEventListener('change', (e) => handleFotoSelecionada(e.target.files[0]));
    if (fotoGaleria) fotoGaleria.addEventListener('change', (e) => handleFotoSelecionada(e.target.files[0]));
} else if (fotoInput) {
    verificarApiKeyGemini();
    fotoInput.addEventListener('change', (e) => handleFotoSelecionada(e.target.files[0]));
}

async function analisarFoto() {
    if (!fotoBase64) { alert('Primeiro seleciona ou tira uma foto.'); return; }

    const apiKey = localStorage.getItem('fittrack_gemini_key');
    if (!apiKey) {
        verificarApiKeyGemini();
        alert('Precisas de guardar a chave API Gemini primeiro. Vê as instruções acima.');
        return;
    }

    const loading    = document.getElementById('foto-loading');
    const btnAnalisar = document.getElementById('btn-analisar');
    const resultado  = document.getElementById('foto-resultado');

    if (loading) loading.style.display = 'block';
    if (btnAnalisar) btnAnalisar.disabled = true;
    if (resultado) resultado.style.display = 'none';

    const prompt = fotoModoAtual === 'rotulo'
        ? `Analisa esta imagem de uma tabela nutricional ou rótulo alimentar. Extrai os valores POR 100g (ou 100ml). Responde APENAS com JSON válido no formato exato: {"nome":"nome do produto","cal":número,"p":número,"h":número,"g":número}. Se não conseguires ler, responde: {"erro":"motivo"}.`
        : `Identifica o alimento nesta imagem e fornece os valores nutricionais aproximados POR 100g baseados em tabelas nutricionais standard. Responde APENAS com JSON válido no formato exato: {"nome":"nome do alimento em português","cal":número,"p":número,"h":número,"g":número}. Se não conseguires identificar, responde: {"erro":"motivo"}.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: 'image/jpeg', data: fotoBase64 } }
                        ]
                    }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            const msg = data.error?.message || `Erro HTTP ${response.status}`;
            throw new Error(msg);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // Extrair JSON da resposta (pode ter texto à volta)
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) throw new Error('Resposta inesperada da IA. Tenta outra foto.');

        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.erro) throw new Error(parsed.erro);

        mostrarResultadoFoto(parsed);

    } catch (err) {
        alert('❌ Erro ao analisar: ' + err.message);
    } finally {
        if (loading) loading.style.display = 'none';
        if (btnAnalisar) btnAnalisar.disabled = false;
    }
}

function mostrarResultadoFoto(dados) {
    const container = document.getElementById('foto-resultado');
    if (!container) return;

    const titulo = fotoModoAtual === 'rotulo' ? '✅ Rótulo lido com sucesso!' : '✅ Alimento identificado!';

    container.style.display = 'block';
    container.innerHTML = `
        <h4>${titulo}</h4>
        <p style="color:var(--cor-texto-claro); font-size:0.85rem; margin-bottom:1rem;">
            Verifica e ajusta os valores antes de adicionar. Os valores de calorias/macros são por 100g.
        </p>
        <div class="form-linha">
            <div class="form-grupo">
                <label>Refeição</label>
                <select id="foto-tipo">
                    <option value="pequeno-almoco">Pequeno-almoço</option>
                    <option value="almoco">Almoço</option>
                    <option value="lanche">Lanche</option>
                    <option value="jantar" selected>Jantar</option>
                    <option value="ceia">Ceia</option>
                </select>
            </div>
            <div class="form-grupo">
                <label>Nome do alimento</label>
                <input type="text" id="foto-nome" value="${dados.nome || ''}" placeholder="Nome do alimento">
            </div>
            <div class="form-grupo">
                <label>Quantidade (g)</label>
                <input type="number" id="foto-qtd" value="100" min="1" step="1">
            </div>
        </div>
        <p style="font-size:0.85rem; color:var(--cor-texto-claro); margin-top:0.5rem; margin-bottom:0.5rem;">
            Valores por 100g (podes editar):
        </p>
        <div class="form-linha">
            <div class="form-grupo">
                <label>Calorias (kcal)</label>
                <input type="number" id="foto-cal" value="${dados.cal ?? ''}" min="0">
            </div>
            <div class="form-grupo">
                <label>Proteína (g)</label>
                <input type="number" id="foto-p" value="${dados.p ?? ''}" min="0" step="0.1">
            </div>
            <div class="form-grupo">
                <label>Hidratos (g)</label>
                <input type="number" id="foto-h" value="${dados.h ?? ''}" min="0" step="0.1">
            </div>
            <div class="form-grupo">
                <label>Gordura (g)</label>
                <input type="number" id="foto-g" value="${dados.g ?? ''}" min="0" step="0.1">
            </div>
        </div>
        <button class="btn btn-secundario" onclick="adicionarDeFoto()" style="margin-top:1rem;">
            + Adicionar à dieta de hoje
        </button>
    `;
}

function adicionarDeFoto() {
    const nome  = document.getElementById('foto-nome')?.value?.trim();
    const qtd   = parseFloat(document.getElementById('foto-qtd')?.value);
    const cal100 = parseFloat(document.getElementById('foto-cal')?.value);
    const p100   = parseFloat(document.getElementById('foto-p')?.value) || 0;
    const h100   = parseFloat(document.getElementById('foto-h')?.value) || 0;
    const g100   = parseFloat(document.getElementById('foto-g')?.value) || 0;
    const tipo   = document.getElementById('foto-tipo')?.value || 'jantar';

    if (!nome)          { alert('Indica o nome do alimento.'); return; }
    if (!qtd || qtd<=0) { alert('Indica uma quantidade válida.'); return; }
    if (isNaN(cal100))  { alert('Indica as calorias por 100g.'); return; }

    const fator = qtd / 100;
    refeicoes.push({
        data: dataHoje(),
        tipo,
        nome,
        quantidade: qtd,
        calorias: +(cal100 * fator).toFixed(0),
        proteina: +(p100   * fator).toFixed(1),
        hidratos: +(h100   * fator).toFixed(1),
        gordura:  +(g100   * fator).toFixed(1)
    });
    Storage.salvar('refeicoes', refeicoes);
    atualizarDieta();

    // Reset secção
    const resultado = document.getElementById('foto-resultado');
    const previewContainer = document.getElementById('foto-preview-container');
    const btnAnalisar = document.getElementById('btn-analisar');
    if (resultado) resultado.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'none';
    if (btnAnalisar) btnAnalisar.style.display = 'none';
    ['foto-input','foto-camera','foto-galeria'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    fotoBase64 = null;

    alert('✅ Adicionado com sucesso!');
}

// ========================================================================
// ===== PÁGINA PESO =====
// ========================================================================
const formPeso = document.getElementById('form-peso');
if (formPeso) {
    document.getElementById('data-registo').valueAsDate = new Date();
    formPeso.addEventListener('submit', (e) => {
        e.preventDefault();
        const registo = {
            data: document.getElementById('data-registo').value,
            peso: parseFloat(document.getElementById('peso').value),
            massaGorda: document.getElementById('massa-gorda').value || '--',
            massaMagra: document.getElementById('massa-magra').value || '--',
            cintura: document.getElementById('cintura').value || '--',
            peito: document.getElementById('peito').value || '--',
            braco: document.getElementById('braco').value || '--'
        };
        registos.push(registo);
        registos.sort((a, b) => new Date(b.data) - new Date(a.data));
        Storage.salvar('pesos', registos);
        atualizarPeso();
        formPeso.reset();
        document.getElementById('data-registo').valueAsDate = new Date();
    });
    atualizarPeso();
}

function atualizarPeso() {
    const tbody = document.getElementById('tabela-pesos');
    if (!tbody) return;

    if (registos.length > 0) {
        const ultimo = registos[0];
        document.getElementById('ultimo-peso').innerHTML = `${ultimo.peso} <span class="unidade">kg</span>`;
        document.getElementById('ultima-gorda').innerHTML = `${ultimo.massaGorda} <span class="unidade">%</span>`;
        document.getElementById('ultima-magra').innerHTML = `${ultimo.massaMagra} <span class="unidade">kg</span>`;
    }

    // IMC + tendência
    atualizarIMC();
    atualizarTendencia();

    if (registos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--cor-texto-claro);">
                           Ainda não tens registos</td></tr>`;
        return;
    }

    tbody.innerHTML = registos.map((r, i) => `
        <tr>
            <td>${formatarData(r.data)}</td>
            <td>${r.peso} kg</td>
            <td>${r.massaGorda}${r.massaGorda !== '--' ? '%' : ''}</td>
            <td>${r.massaMagra}${r.massaMagra !== '--' ? ' kg' : ''}</td>
            <td>${r.cintura}${r.cintura !== '--' ? ' cm' : ''}</td>
            <td>${r.peito}${r.peito !== '--' ? ' cm' : ''}</td>
            <td>${r.braco}${r.braco !== '--' ? ' cm' : ''}</td>
            <td><button class="btn btn-perigo" onclick="removerRegisto(${i})">Remover</button></td>
        </tr>`).join('');
}

function atualizarIMC() {
    const el = document.getElementById('imc-valor');
    if (!el) return;
    if (registos.length === 0 || !perfilMacros || !perfilMacros.altura) {
        el.textContent = '--';
        document.getElementById('imc-classif').textContent = 'Adiciona altura na calculadora de macros';
        return;
    }
    const peso = registos[0].peso;
    const alturaM = perfilMacros.altura / 100;
    const imc = peso / (alturaM * alturaM);
    el.textContent = imc.toFixed(1);
    let classif;
    if      (imc < 18.5) classif = 'Abaixo do peso';
    else if (imc < 25)   classif = 'Peso normal';
    else if (imc < 30)   classif = 'Excesso de peso';
    else                 classif = 'Obesidade';
    document.getElementById('imc-classif').textContent = classif;
}

function atualizarTendencia() {
    const el = document.getElementById('tendencia-valor');
    if (!el) return;
    if (registos.length < 2) {
        el.textContent = '--';
        document.getElementById('tendencia-desc').textContent = 'Precisa de pelo menos 2 registos';
        return;
    }
    const ordenados = [...registos].sort((a, b) => new Date(a.data) - new Date(b.data));
    const primeiro = ordenados[0];
    const ultimo = ordenados[ordenados.length - 1];
    const dias = diasEntre(primeiro.data, ultimo.data) || 1;
    const semanas = dias / 7;
    const diferenca = ultimo.peso - primeiro.peso;
    const porSemana = diferenca / semanas;
    el.textContent = (porSemana >= 0 ? '+' : '') + porSemana.toFixed(2) + ' kg';
    document.getElementById('tendencia-desc').textContent = `por semana (${dias} dias de registos)`;
    el.style.color = Math.abs(porSemana) < 0.1 ? 'var(--cor-texto)' : (porSemana > 0 ? 'var(--cor-hidratos)' : 'var(--cor-secundaria)');
}

function removerRegisto(index) {
    registos.splice(index, 1);
    Storage.salvar('pesos', registos);
    atualizarPeso();
}

// ========================================================================
// ===== CALCULADORA DE MACROS =====
// ========================================================================
const formMacros = document.getElementById('form-macros');
if (formMacros) {
    if (perfilMacros) {
        document.getElementById('sexo').value = perfilMacros.sexo;
        document.getElementById('idade').value = perfilMacros.idade;
        document.getElementById('altura').value = perfilMacros.altura;
        document.getElementById('peso-atual').value = perfilMacros.peso;
        if (perfilMacros.massaGorda) document.getElementById('massa-gorda-macros').value = perfilMacros.massaGorda;
        document.getElementById('atividade').value = perfilMacros.atividade;
        document.getElementById('objetivo').value = perfilMacros.objetivo;
        calcularMacros();
    }
    formMacros.addEventListener('submit', (e) => { e.preventDefault(); calcularMacros(); });
}

function calcularMacros() {
    const sexo = document.getElementById('sexo').value;
    const idade = parseFloat(document.getElementById('idade').value);
    const altura = parseFloat(document.getElementById('altura').value);
    const peso = parseFloat(document.getElementById('peso-atual').value);
    const massaGorda = parseFloat(document.getElementById('massa-gorda-macros').value);
    const atividade = parseFloat(document.getElementById('atividade').value);
    const objetivo = document.getElementById('objetivo').value;

    let tmb, formulaUsada;
    if (!isNaN(massaGorda) && massaGorda > 0) {
        const massaMagra = peso * (1 - massaGorda / 100);
        tmb = 370 + (21.6 * massaMagra);
        formulaUsada = `Fórmula <strong>Katch-McArdle</strong> (usa a massa magra: ${massaMagra.toFixed(1)} kg). É mais precisa porque tem em conta a tua composição corporal.`;
    } else {
        tmb = sexo === 'masculino'
            ? (10 * peso) + (6.25 * altura) - (5 * idade) + 5
            : (10 * peso) + (6.25 * altura) - (5 * idade) - 161;
        formulaUsada = `Fórmula <strong>Mifflin-St Jeor</strong> (padrão em nutrição). Se adicionares a tua % de massa gorda, o cálculo fica ainda mais preciso.`;
    }

    const tdee = tmb * atividade;
    const ajustes = { 'perder': 0.80, 'perder-leve': 0.90, 'manter': 1.00, 'ganhar-leve': 1.10, 'ganhar': 1.20 };
    const nomesObj = { 'perder': 'Défice agressivo (-20%)', 'perder-leve': 'Défice leve (-10%)', 'manter': 'Manutenção', 'ganhar-leve': 'Superávit leve (+10%)', 'ganhar': 'Superávit (+20%)' };
    const calAlvo = tdee * ajustes[objetivo];

    let proteinaPorKg;
    if (objetivo === 'perder' || objetivo === 'perder-leve') proteinaPorKg = 2.2;
    else if (objetivo === 'manter') proteinaPorKg = 2.0;
    else proteinaPorKg = 1.8;

    const proteinaG = peso * proteinaPorKg;
    const proteinaCal = proteinaG * 4;
    const gorduraCal = calAlvo * 0.25;
    const gorduraG = gorduraCal / 9;
    const hidratosCal = calAlvo - proteinaCal - gorduraCal;
    const hidratosG = hidratosCal / 4;
    const aguaL = (peso * 35) / 1000;

    document.getElementById('res-tmb').textContent = tmb.toFixed(0);
    document.getElementById('res-tdee').textContent = tdee.toFixed(0);
    document.getElementById('res-alvo').textContent = calAlvo.toFixed(0);
    document.getElementById('res-obj').textContent = nomesObj[objetivo];
    document.getElementById('res-agua').textContent = aguaL.toFixed(1);
    document.getElementById('res-p').textContent = proteinaG.toFixed(0);
    document.getElementById('res-h').textContent = hidratosG.toFixed(0);
    document.getElementById('res-g').textContent = gorduraG.toFixed(0);
    document.getElementById('res-p-cal').textContent = proteinaCal.toFixed(0);
    document.getElementById('res-h-cal').textContent = hidratosCal.toFixed(0);
    document.getElementById('res-g-cal').textContent = gorduraCal.toFixed(0);
    document.getElementById('info-formula').innerHTML = formulaUsada;
    document.getElementById('info-p').textContent = proteinaPorKg;
    document.getElementById('resultados').style.display = 'block';

    perfilMacros = { sexo, idade, altura, peso, massaGorda: isNaN(massaGorda) ? null : massaGorda, atividade, objetivo };
    Storage.salvar('perfil', perfilMacros);
    Storage.salvar('objetivoCalorias', Math.round(calAlvo));
    objetivoCalorias = Math.round(calAlvo);
}

// ========================================================================
// ===== ÁGUA =====
// ========================================================================
function aguaML(data = dataHoje()) { return agua[data] || 0; }

function setAguaML(ml, data = dataHoje()) {
    agua[data] = Math.max(0, Math.round(ml));
    Storage.salvar('agua', agua);
    atualizarAguaUI();
}
function addAguaML(ml) { setAguaML(aguaML() + ml); }
function incAgua() { addAguaML(250); }
function decAgua() { addAguaML(-250); }
function resetAgua() { setAguaML(0); }

function adicionarAguaCustom() {
    const input = document.getElementById('agua-custom-input');
    if (!input) return;
    const ml = parseInt(input.value);
    if (!ml || ml <= 0) { alert('Indica uma quantidade válida em ml.'); return; }
    addAguaML(ml);
    input.value = '';
}

function definirObjetivoAgua() {
    const input = document.getElementById('agua-objetivo-input');
    if (!input) return;
    const ml = parseInt(input.value);
    if (!ml || ml < 100) { alert('Indica uma meta válida (mínimo 100ml).'); return; }
    objetivoAguaML = ml;
    Storage.salvar('objetivoAguaML', objetivoAguaML);
    atualizarAguaUI();
    input.value = '';
}

function atualizarAguaUI() {
    const ml = aguaML();
    const copos = Math.floor(ml / 250);
    const objCopos = Math.round(objetivoAguaML / 250);
    document.querySelectorAll('[data-agua]').forEach(el => {
        const tipo = el.dataset.agua;
        if (tipo === 'copos')        el.textContent = copos;
        if (tipo === 'ml')           el.textContent = ml;
        if (tipo === 'objetivo')     el.textContent = objCopos;
        if (tipo === 'objetivo-ml')  el.textContent = objetivoAguaML;
        if (tipo === 'barra')        el.style.width = Math.min((ml / objetivoAguaML) * 100, 100) + '%';
    });
}
atualizarAguaUI();

// ========================================================================
// ===== DIÁRIO (SONO / ENERGIA / NOTAS) =====
// ========================================================================
const formDiario = document.getElementById('form-diario');
if (formDiario) {
    const inputDataDiario = document.getElementById('data-diario');
    if (inputDataDiario) inputDataDiario.value = dataHoje();

    if (inputDataDiario) {
        inputDataDiario.addEventListener('change', carregarDiarioDaData);
        carregarDiarioDaData();
    }

    formDiario.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = inputDataDiario.value;
        diario[data] = {
            sono: parseFloat(document.getElementById('sono').value) || null,
            energia: parseInt(document.getElementById('energia').value) || null,
            humor: document.getElementById('humor').value,
            notas: document.getElementById('notas').value
        };
        Storage.salvar('diario', diario);
        atualizarHistoricoDiario();
        alert('Registo guardado!');
    });

    atualizarHistoricoDiario();
}

function carregarDiarioDaData() {
    const data = document.getElementById('data-diario').value;
    const entrada = diario[data];
    document.getElementById('sono').value    = entrada?.sono   ?? '';
    document.getElementById('energia').value = entrada?.energia ?? '';
    document.getElementById('humor').value   = entrada?.humor  || 'neutro';
    document.getElementById('notas').value   = entrada?.notas  || '';
}

function atualizarHistoricoDiario() {
    const container = document.getElementById('historico-diario');
    if (!container) return;
    const datas = Object.keys(diario).sort((a, b) => new Date(b) - new Date(a)).slice(0, 14);
    if (datas.length === 0) {
        container.innerHTML = `<p style="color:var(--cor-texto-claro);">Ainda não tens entradas.</p>`;
        return;
    }
    const emojisHumor = { otimo: 'Ótimo', bom: 'Bom', neutro: 'Neutro', mau: 'Mau', pessimo: 'Péssimo' };
    container.innerHTML = datas.map(d => {
        const e = diario[d];
        return `
        <div class="dia-historico">
            <div class="dia-cabecalho">
                <strong>${formatarData(d)}</strong>
                <div class="dia-totais">
                    ${e.sono ? `<span>Sono: <strong>${e.sono}h</strong></span>` : ''}
                    ${e.energia ? `<span>Energia: <strong>${e.energia}/10</strong></span>` : ''}
                    ${e.humor ? `<span>Humor: <strong>${emojisHumor[e.humor] || e.humor}</strong></span>` : ''}
                </div>
            </div>
            ${e.notas ? `<p style="color:var(--cor-texto-claro); font-size:0.95rem;">${e.notas}</p>` : ''}
        </div>`;
    }).join('');
}

// ========================================================================
// ===== GRÁFICOS (estatisticas.html) =====
// ========================================================================
function gerarGraficos() {
    if (typeof Chart === 'undefined') return;

    const isLight = document.body.classList.contains('light-mode');
    const textColor  = isLight ? '#1e293b' : '#f1f5f9';
    const textMuted  = isLight ? '#64748b' : '#94a3b8';
    const gridColor  = isLight ? '#cbd5e1' : '#334155';

    // --- Peso ao longo do tempo ---
    const ctxPeso = document.getElementById('grafico-peso');
    if (ctxPeso && registos.length > 0) {
        const ordenados = [...registos].sort((a, b) => new Date(a.data) - new Date(b.data));
        new Chart(ctxPeso, {
            type: 'line',
            data: {
                labels: ordenados.map(r => formatarData(r.data)),
                datasets: [{
                    label: 'Peso (kg)',
                    data: ordenados.map(r => r.peso),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.3, fill: true, borderWidth: 2
                }]
            },
            options: estiloGrafico(textColor, textMuted, gridColor)
        });
    }

    // --- Calorias nos últimos 14 dias ---
    const ctxCal = document.getElementById('grafico-calorias');
    if (ctxCal) {
        const labels = [], data = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            labels.push(formatarData(ds).slice(0,5));
            const refs = refeicoes.filter(r => r.data === ds);
            data.push(refs.reduce((s, r) => s + r.calorias, 0));
        }
        new Chart(ctxCal, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Calorias', data,
                    backgroundColor: '#3b82f6', borderRadius: 6
                }, {
                    label: 'Objetivo', data: Array(14).fill(objetivoCalorias),
                    type: 'line', borderColor: '#ef4444', borderWidth: 2,
                    borderDash: [5, 5], pointRadius: 0
                }]
            },
            options: estiloGrafico(textColor, textMuted, gridColor)
        });
    }

    // --- Macros médios últimos 7 dias ---
    const ctxMacros = document.getElementById('grafico-macros');
    if (ctxMacros) {
        let p = 0, h = 0, g = 0, dias = 0;
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const refs = refeicoes.filter(r => r.data === ds);
            if (refs.length > 0) {
                p += refs.reduce((s, r) => s + r.proteina, 0);
                h += refs.reduce((s, r) => s + r.hidratos, 0);
                g += refs.reduce((s, r) => s + r.gordura, 0);
                dias++;
            }
        }
        if (dias > 0) {
            new Chart(ctxMacros, {
                type: 'doughnut',
                data: {
                    labels: ['Proteína', 'Hidratos', 'Gordura'],
                    datasets: [{
                        data: [(p/dias*4).toFixed(0), (h/dias*4).toFixed(0), (g/dias*9).toFixed(0)],
                        backgroundColor: ['#ef4444', '#f59e0b', '#8b5cf6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
                }
            });
        }
    }

    // --- Água últimos 14 dias ---
    const ctxAgua = document.getElementById('grafico-agua');
    if (ctxAgua) {
        const labels = [], data = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            labels.push(formatarData(ds).slice(0,5));
            data.push(agua[ds] || 0);
        }
        new Chart(ctxAgua, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'ml de água', data, backgroundColor: '#10b981', borderRadius: 6 }] },
            options: estiloGrafico(textColor, textMuted, gridColor)
        });
    }
}

function estiloGrafico(textColor, textMuted, gridColor) {
    return {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
            x: { ticks: { color: textMuted }, grid: { color: gridColor } },
            y: { ticks: { color: textMuted }, grid: { color: gridColor } }
        }
    };
}

if (document.getElementById('grafico-peso') || document.getElementById('grafico-calorias')) {
    if (typeof Chart !== 'undefined') gerarGraficos();
    else window.addEventListener('load', gerarGraficos);
}

// ========================================================================
// ===== EXPORTAR / IMPORTAR =====
// ========================================================================
function exportarDados() {
    const dados = {
        refeicoes, pesos: registos, perfil: perfilMacros,
        objetivoCalorias, alimentosCustom, favoritas, agua, diario,
        exportadoEm: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittrack-backup-${dataHoje()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const dados = JSON.parse(e.target.result);
            if (!confirm('Isto vai substituir os teus dados atuais. Continuar?')) return;
            if (dados.refeicoes)        Storage.salvar('refeicoes', dados.refeicoes);
            if (dados.pesos)            Storage.salvar('pesos', dados.pesos);
            if (dados.perfil)           Storage.salvar('perfil', dados.perfil);
            if (dados.objetivoCalorias) Storage.salvar('objetivoCalorias', dados.objetivoCalorias);
            if (dados.alimentosCustom)  Storage.salvar('alimentosCustom', dados.alimentosCustom);
            if (dados.favoritas)        Storage.salvar('favoritas', dados.favoritas);
            if (dados.agua)             Storage.salvar('agua', dados.agua);
            if (dados.diario)           Storage.salvar('diario', dados.diario);
            alert('Dados importados! A página vai recarregar.');
            location.reload();
        } catch (err) {
            alert('Ficheiro inválido: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function limparTodosDados() {
    if (!confirm('Tens a certeza? Isto apaga TUDO (refeições, pesos, perfil, favoritas, água, diário). Faz export antes!')) return;
    if (!confirm('Última chance. Confirma?')) return;
    ['refeicoes','pesos','perfil','objetivoCalorias','alimentosCustom','favoritas','agua','diario'].forEach(k => Storage.remover(k));
    location.reload();
}

// ========================================================================
// ===== DASHBOARD =====
// ========================================================================
function atualizarDashboard() {
    const elCalHoje = document.getElementById('dash-calorias-hoje');
    if (!elCalHoje) return;

    const hoje = dataHoje();
    const refHoje = refeicoes.filter(r => r.data === hoje);
    let cal = 0, p = 0, h = 0, g = 0;
    refHoje.forEach(r => { cal += r.calorias; p += r.proteina; h += r.hidratos; g += r.gordura; });

    elCalHoje.textContent = cal.toFixed(0);
    document.getElementById('dash-objetivo').textContent = objetivoCalorias;
    document.getElementById('dash-proteina').textContent = p.toFixed(0) + 'g';
    document.getElementById('dash-hidratos').textContent = h.toFixed(0) + 'g';
    document.getElementById('dash-gordura').textContent = g.toFixed(0) + 'g';

    const ultimoPeso = registos[0];
    document.getElementById('dash-peso').textContent = ultimoPeso ? ultimoPeso.peso : '--';
    document.getElementById('dash-massa-magra').textContent =
        (ultimoPeso && ultimoPeso.massaMagra !== '--') ? ultimoPeso.massaMagra : '--';
}
atualizarDashboard();
