(function() {
    'use strict';

    var DEST = (window.location.pathname.indexOf('/quiz/') !== -1) ? '../bridge.html' : 'bridge.html';
    var TOTAL = 8;
    var ANALYSIS_MS = 10000;

    var LOGS = [
        'Processando padrões de comportamento digital...',
        'Analisando indicadores de proteção do celular...',
        'Cruzando atividade em redes sociais...',
        'Mapeando mudanças de rotina...',
        'Avaliando padrões emocionais e de intimidade...',
        'Detectando sinais de compensação por culpa...',
        'Comparando com 127.493 análises anteriores...',
        'Identificando nível de risco...',
        'Gerando diagnóstico personalizado...'
    ];

    var SIGNAL_MAP = {
        2: { a: 'Proteção extrema do celular — comportamento típico de quem esconde conversas', b: 'Celular sempre no silencioso — padrão de ocultação de notificações' },
        3: { a: 'Atividade suspeita em redes sociais — perfis ocultos ou conversas apagadas', b: 'Tempo excessivo em redes sociais sem transparência' },
        4: { a: 'Mudança drástica de rotina — pretextos novos e inexplicáveis', b: 'Pequenas inconsistências na rotina — horários e histórias que não batem' },
        5: { a: 'Frieza emocional e distância na intimidade', b: 'Oscilação emocional — padrão de culpa e compensação' },
        6: { a: 'Gentilezas excessivas sem motivo — comportamento clássico de compensação por culpa', b: 'Momentos isolados de culpa aparente' },
        7: { a: 'Provocação de conflitos para justificar distância', b: 'Aumento de irritabilidade e impaciência sem causa' },
        8: { a: 'Intuição forte de que algo está sendo escondido', b: 'Dúvida persistente e insegurança constante' }
    };

    var LEVELS = {
        high: {
            label: 'ALTO RISCO',
            color: '#ef4444',
            headline: 'Seu relacionamento apresenta múltiplos sinais críticos de infidelidade.',
            diag: 'Suas respostas revelam um <strong>padrão consistente e alarmante</strong>. Os sinais que você descreveu aparecem juntos em <strong>87% dos casos que se confirmaram como traição</strong>. Isso não é ansiedade. Não é insegurança. É o seu instinto reconhecendo um padrão real — e ele quase nunca erra.',
            stat: '87%'
        },
        moderate: {
            label: 'RISCO MODERADO',
            color: '#f59e0b',
            headline: 'Existem sinais preocupantes que você não pode ignorar.',
            diag: 'Seu perfil revela <strong>sinais moderados mas significativos</strong>. Em 64% dos casos com esse perfil, a suspeita se confirmou depois. A diferença entre quem descobriu a tempo e quem descobriu tarde demais foi <strong>uma decisão: agir agora ou esperar</strong>.',
            stat: '64%'
        },
        low: {
            label: 'ATENÇÃO',
            color: '#22c55e',
            headline: 'Poucos sinais detectados — mas algo te trouxe até aqui.',
            diag: 'Os indicadores são baixos, mas o fato de você ter chegado até aqui revela uma <strong>dúvida que não vai embora sozinha</strong>. Em 38% dos casos com esse perfil, havia algo sendo escondido. A única forma de ter paz é <strong>ter certeza</strong>.',
            stat: '38%'
        }
    };

    var state = {
        answers: {},
        score: 0,
        gender: null,
        currentScene: 0
    };

    document.addEventListener('DOMContentLoaded', function() {
        typewriteHook();
        bindAll();
    });

    // ── Typewriter ──
    function typewriteHook() {
        var el = document.getElementById('hookTitle');
        var segments = [
            { text: 'Ele(a) está ', cls: '' },
            { text: 'escondendo', cls: 'word-green' },
            { text: '\n', cls: '' },
            { text: 'algo de você', cls: '' },
            { text: '?', cls: '' }
        ];

        var plain = segments.map(function(s) { return s.text; }).join('');
        var idx = 0;
        el.innerHTML = '<span class="cursor"></span>';

        function tick() {
            if (idx >= plain.length) {
                renderFull();
                return;
            }
            idx++;
            renderPartial();
            var d = plain[idx - 1] === '\n' ? 180 : 35 + Math.random() * 25;
            setTimeout(tick, d);
        }

        function renderPartial() {
            var html = '', pos = 0;
            segments.forEach(function(s) {
                var end = pos + s.text.length;
                var vis = Math.max(0, Math.min(idx, end) - pos);
                var t = s.text.substring(0, vis).replace(/\n/g, '<br>');
                if (vis > 0) html += s.cls ? '<span class="' + s.cls + '">' + t + '</span>' : t;
                pos = end;
            });
            el.innerHTML = html + '<span class="cursor"></span>';
        }

        function renderFull() {
            var html = '';
            segments.forEach(function(s) {
                var t = s.text.replace(/\n/g, '<br>');
                html += s.cls ? '<span class="' + s.cls + '">' + t + '</span>' : t;
            });
            el.innerHTML = html;
        }

        setTimeout(tick, 700);
    }

    // ── Bind ──
    function bindAll() {
        document.getElementById('btnStart').addEventListener('click', function() {
            goToScene(1);
            if (typeof FacebookCAPI !== 'undefined') {
                FacebookCAPI.trackEvent('QuizStarted', { content_name: 'Quiz' });
            } else if (typeof fbq === 'function') {
                fbq('trackCustom', 'QuizStarted');
            }
        });

        document.querySelectorAll('.opt[data-q]').forEach(function(btn) {
            btn.addEventListener('click', function() { onSelect(btn); });
        });
    }

    // ── Selection ──
    function onSelect(btn) {
        var q = parseInt(btn.dataset.q);
        var v = btn.dataset.v;
        var p = parseInt(btn.dataset.p);

        state.answers[q] = { value: v, points: p };
        state.score = Object.values(state.answers).reduce(function(s, a) { return s + a.points; }, 0);

        if (q === 1) {
            state.gender = v;
            localStorage.setItem('targetGender', v);
        }

        btn.closest('.opts').querySelectorAll('.opt').forEach(function(o) { o.classList.remove('selected'); });
        btn.classList.add('selected');
        if (navigator.vibrate) navigator.vibrate(25);

        setTimeout(function() {
            if (q < TOTAL) {
                goToScene(q + 1);
            } else {
                goToScene('analysis');
                runAnalysis();
            }
        }, 450);
    }

    // ── Navigation ──
    function goToScene(id) {
        var cur = document.querySelector('.scene.active');
        var next = document.querySelector('[data-scene="' + id + '"]');
        if (!next) return;

        if (typeof id === 'number' && id >= 1 && id <= TOTAL) {
            showProgress(id);
        } else {
            hideProgress();
        }

        if (cur) {
            cur.classList.add('leaving');
            cur.classList.remove('active');
            setTimeout(function() { cur.classList.remove('leaving'); }, 400);
        }

        setTimeout(function() {
            next.classList.add('active');
            state.currentScene = id;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 120);
    }

    function showProgress(q) {
        var bar = document.getElementById('topbar');
        bar.classList.add('visible');
        document.getElementById('topbarFill').style.width = ((q / TOTAL) * 100) + '%';
        document.getElementById('topbarLabel').textContent = q + ' de ' + TOTAL;
    }

    function hideProgress() {
        document.getElementById('topbar').classList.remove('visible');
    }

    // ── Analysis ──
    function runAnalysis() {
        var pctEl = document.getElementById('scanPct');
        var logEl = document.getElementById('analysisLog');
        var headEl = document.getElementById('analysisHeadline');
        var subEl = document.getElementById('analysisSub');
        var start = Date.now();

        logEl.innerHTML = '';
        LOGS.forEach(function(text) {
            var div = document.createElement('div');
            div.className = 'log-line';
            div.innerHTML = '<span class="log-dot"></span><span>' + text + '</span>';
            logEl.appendChild(div);
        });

        var lines = logEl.querySelectorAll('.log-line');
        var step = ANALYSIS_MS / (LOGS.length + 1);

        lines.forEach(function(line, i) {
            setTimeout(function() { line.classList.add('show', 'processing'); }, step * i);
            setTimeout(function() { line.classList.remove('processing'); line.classList.add('done'); }, step * i + step * 0.7);
        });

        var pctI = setInterval(function() {
            var el = Date.now() - start;
            var raw = el / ANALYSIS_MS;
            var eased = 1 - Math.pow(1 - Math.min(raw, 1), 2.5);
            pctEl.textContent = Math.round(eased * 100);
            if (raw >= 1) clearInterval(pctI);
        }, 50);

        setTimeout(function() {
            headEl.style.opacity = '0';
            subEl.style.opacity = '0';
            setTimeout(function() {
                headEl.textContent = 'Diagnóstico quase pronto...';
                subEl.textContent = 'Finalizando o resultado';
                headEl.style.opacity = '1';
                subEl.style.opacity = '1';
            }, 300);
        }, ANALYSIS_MS * 0.55);

        setTimeout(function() {
            headEl.style.opacity = '0';
            subEl.style.opacity = '0';
            setTimeout(function() {
                headEl.textContent = 'Resultado pronto.';
                subEl.textContent = '';
                headEl.style.opacity = '1';
            }, 300);
        }, ANALYSIS_MS * 0.88);

        setTimeout(function() {
            try { showResult(); } catch(e) { console.error('showResult error:', e); goToScene('result'); }
        }, ANALYSIS_MS + 1000);
    }

    function showResult() {
        var maxScore = TOTAL * 15;
        var rawPct = Math.round((state.score / maxScore) * 100);
        var displayPct = Math.max(65, Math.min(rawPct + 20, 97));

        var key = displayPct >= 75 ? 'high' : displayPct >= 50 ? 'moderate' : 'low';
        var level = LEVELS[key];
        var c = level.color;

        var el;
        el = document.getElementById('resLevel');
        if (el) { el.textContent = level.label; el.style.color = c; }
        el = document.getElementById('resHeadline');
        if (el) el.textContent = level.headline;
        el = document.getElementById('resStat');
        if (el) el.textContent = level.stat;
        el = document.getElementById('resNumber');
        if (el) el.style.color = c;
        el = document.querySelector('.res-pct');
        if (el) el.style.color = c;

        var diagBox = document.getElementById('resDiagnosis');
        if (diagBox) {
            diagBox.style.borderLeftColor = c;
            var svgEl = diagBox.querySelector('.diag-header svg');
            if (svgEl) svgEl.style.stroke = c;
        }
        el = document.getElementById('diagText');
        if (el) el.innerHTML = level.diag;

        var signalsList = document.getElementById('signalsList');
        if (signalsList) {
            signalsList.innerHTML = '';
            var delay = 0;
            for (var q = 2; q <= TOTAL; q++) {
                var ans = state.answers[q];
                if (!ans) continue;
                var map = SIGNAL_MAP[q];
                if (!map) continue;
                var signalText = map[ans.value];
                if (!signalText) continue;

                var isYellow = ans.value === 'b';
                var div = document.createElement('div');
                div.className = 'signal-item' + (isYellow ? ' yellow' : '');
                div.style.animationDelay = (delay * 0.1) + 's';
                div.innerHTML = '<span class="signal-dot"></span>' + signalText;
                signalsList.appendChild(div);
                delay++;
            }
        }

        var arc = document.getElementById('resArc');
        var circumference = 276.46;
        var offset = circumference - (circumference * displayPct / 100);

        var url = DEST + '?from_quiz=true&score=' + displayPct;
        try {
            var params = window.location.search;
            if (typeof TrackingUtils !== 'undefined') {
                var baseUrl = DEST + (params || '') + (params ? '&' : '?') + 'from_quiz=true&score=' + displayPct;
                url = TrackingUtils.appendUTMs(baseUrl);
            } else {
                if (!params || params.indexOf('utm_source') === -1) {
                    var utmKeys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
                    var stored = [];
                    utmKeys.forEach(function(k) { var v = localStorage.getItem(k); if (v) stored.push(k + '=' + encodeURIComponent(v)); });
                    if (stored.length) params = (params ? params + '&' : '?') + stored.join('&');
                }
                var sep = params ? '&' : '?';
                url = DEST + params + sep + 'from_quiz=true&score=' + displayPct;
            }
        } catch(e) { console.error('URL build error:', e); }

        goToScene('result');

        var ctaF = document.getElementById('ctaFinal');
        var ctaS = document.getElementById('ctaSecondary');
        if (ctaF) { ctaF.href = url; ctaF.onclick = function() { window.location.href = url; }; }
        if (ctaS) { ctaS.href = url; ctaS.onclick = function() { window.location.href = url; }; }

        setTimeout(function() {
            if (arc) {
                arc.style.stroke = c;
                arc.style.strokeDashoffset = offset;
            }
            countUp('resNumber', 0, displayPct, 2500);
        }, 500);

        try {
            var quizData = {
                score: displayPct,
                level: level.label,
                gender: state.gender || 'unknown',
                signals: Object.keys(state.answers).filter(function(k) {
                    return state.answers[k].value === 'a';
                }).length
            };
            if (typeof FacebookCAPI !== 'undefined') {
                FacebookCAPI.trackEvent('QuizCompleted', Object.assign({ content_name: 'Quiz' }, quizData));
            } else if (typeof fbq === 'function') {
                fbq('trackCustom', 'QuizCompleted', quizData);
            }
        } catch(e) { console.error('Quiz tracking error:', e); }
    }

    function countUp(id, from, to, duration) {
        var el = document.getElementById(id);
        var startT = performance.now();
        function frame(ts) {
            var p = Math.min((ts - startT) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(from + (to - from) * eased);
            if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

})();
