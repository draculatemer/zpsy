(function() {
    'use strict';

    var DEST = (window.location.pathname.indexOf('/quiz/') !== -1) ? '../bridge.html' : 'bridge.html';
    var _fromPhone = (window.location.search.indexOf('from_phone=true') !== -1);
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
        2: { a: 'Motivo legítimo: suspeita fundamentada que requer investigação', b: 'Dúvidas iniciais que requerem esclarecimento' },
        3: { a: 'Preparo emocional confirmado para receber informações sensíveis', b: 'Preparo parcial — necessita acompanhamento' },
        4: { a: 'Exposição prolongada a estresse emocional — caso prioritário', b: 'Impacto recente mas crescente na saúde mental' },
        5: { a: 'Compromisso total de sigilo e uso responsável confirmado', b: 'Compromisso parcial de confidencialidade' },
        6: { a: 'Métodos alternativos esgotados — necessidade comprovada', b: 'Hesitação em agir por medo de confronto' },
        7: { a: 'Perfil de reação responsável e controlada', b: 'Intenção de buscar a verdade antes de agir' },
        8: { a: 'Aceitação completa dos termos e responsabilidades', b: 'Aceitação com ressalvas — perfil cauteloso' }
    };

    var LEVELS = {
        high: {
            label: 'ACESSO IMEDIATO APROVADO',
            color: '#22c55e',
            headline: 'Verificação concluída. Você foi aprovado(a) para acesso imediato.',
            diag: 'Suas respostas demonstram <strong>necessidade genuína e maturidade emocional</strong> para utilizar esta ferramenta. Seu perfil atende a todos os critérios de segurança. <strong>Acesso liberado sem restrições</strong> — aproveite enquanto sua vaga está reservada.',
            stat: '97%'
        },
        moderate: {
            label: 'ACESSO APROVADO',
            color: '#f59e0b',
            headline: 'Verificação concluída. Seu acesso foi liberado.',
            diag: 'Seu perfil atende aos <strong>critérios mínimos de segurança</strong>. Embora algumas respostas indiquem hesitação, identificamos necessidade real. <strong>Seu acesso foi aprovado</strong> — mas é limitado e pode expirar a qualquer momento.',
            stat: '83%'
        },
        low: {
            label: 'ACESSO CONDICIONAL',
            color: '#f59e0b',
            headline: 'Verificação concluída. Acesso liberado com restrições.',
            diag: 'Embora suas respostas indiquem menor urgência, o fato de ter chegado até aqui demonstra uma <strong>necessidade que não pode ser ignorada</strong>. Seu acesso foi liberado condicionalmente — <strong>aja agora antes que expire</strong>.',
            stat: '64%'
        }
    };

    var state = {
        answers: {},
        score: 0,
        gender: null,
        currentScene: 0
    };

    document.addEventListener('DOMContentLoaded', function() {
        personalizeGreeting();
        typewriteHook();
        bindAll();
    });

    function personalizeGreeting() {
        var el = document.getElementById('hookGreeting');
        if (!el) return;
        var name = '';
        try { name = localStorage.getItem('userName') || ''; } catch(e) {}
        if (name) {
            var first = name.trim().split(' ')[0];
            first = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
            el.innerHTML = '<span>' + first + '</span>, precisamos verificar seu acesso.';
            el.style.display = '';
        }
    }

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
            var startScene = 1;
            if (_fromPhone) {
                var gp = new URLSearchParams(window.location.search).get('gender');
                if (gp) {
                    state.gender = gp;
                    state.answers[1] = { value: gp, points: 0 };
                    localStorage.setItem('targetGender', gp);
                    startScene = 2;
                }
            }
            goToScene(startScene);
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

        setTimeout(showResult, ANALYSIS_MS + 1000);
    }

    // ── Result ──
    function showResult() {
        var maxScore = TOTAL * 15;
        var rawPct = Math.round((state.score / maxScore) * 100);
        // Ensure minimum 65%, cap at 97% — always feels urgent
        var displayPct = Math.max(65, Math.min(rawPct + 20, 97));

        var key = displayPct >= 75 ? 'high' : displayPct >= 50 ? 'moderate' : 'low';
        var level = LEVELS[key];
        var c = level.color;

        // Level / headline
        document.getElementById('resLevel').textContent = level.label;
        document.getElementById('resLevel').style.color = c;
        document.getElementById('resHeadline').textContent = level.headline;
        var resStatEl = document.getElementById('resStat');
        if (resStatEl) resStatEl.textContent = level.stat;
        document.getElementById('resNumber').style.color = c;
        document.querySelector('.res-pct').style.color = c;

        // Diagnosis border color
        var diagBox = document.getElementById('resDiagnosis');
        diagBox.style.borderLeftColor = c;
        diagBox.querySelector('.diag-header svg').style.stroke = c;
        document.getElementById('diagText').innerHTML = level.diag;

        // Build detected signals
        var signalsList = document.getElementById('signalsList');
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

        // Arc
        var arc = document.getElementById('resArc');
        arc.style.stroke = c;
        var circumference = 276.46;
        var offset = circumference - (circumference * displayPct / 100);

        // CTA
        var params = window.location.search;
        var url = DEST + '?from_quiz=true&score=' + displayPct;
        try {
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

        if (_fromPhone) {
            var gp = state.gender || localStorage.getItem('targetGender') || '';
            url = '../phone.html?resume=true' + (gp ? '&gender=' + gp : '');
        }

        goToScene('result');

        var ctaF = document.getElementById('ctaFinal');
        var ctaS = document.getElementById('ctaSecondary');
        if (ctaF) { ctaF.href = url; ctaF.onclick = function() { window.location.href = url; }; }
        if (ctaS) { ctaS.href = url; ctaS.onclick = function() { window.location.href = url; }; }

        startAccessCountdown();

        // Animate after visible
        setTimeout(function() {
            arc.style.strokeDashoffset = offset;
            countUp('resNumber', 0, displayPct, 2500);
        }, 500);

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
    }

    function startAccessCountdown() {
        var COUNTDOWN_KEY = 'accessExpiresAt';
        var SLOTS_KEY = 'accessSlots';
        var DURATION = 15 * 60 * 1000;

        var expiresAt = localStorage.getItem(COUNTDOWN_KEY);
        if (!expiresAt) {
            expiresAt = Date.now() + DURATION;
            localStorage.setItem(COUNTDOWN_KEY, expiresAt);
            localStorage.setItem(SLOTS_KEY, Math.floor(Math.random() * 3) + 2);
        }
        expiresAt = parseInt(expiresAt);

        var box = document.getElementById('resCountdownBox');
        var timerEl = document.getElementById('countdownTimer');
        var slotsEl = document.getElementById('countdownSlots');
        if (!box || !timerEl) return;

        var slots = parseInt(localStorage.getItem(SLOTS_KEY)) || 3;
        if (slotsEl) slotsEl.textContent = slots;

        box.style.display = '';

        function tick() {
            var remaining = Math.max(0, expiresAt - Date.now());
            var mins = Math.floor(remaining / 60000);
            var secs = Math.floor((remaining % 60000) / 1000);
            timerEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;

            if (mins < 5) timerEl.classList.add('urgent');
            else timerEl.classList.remove('urgent');

            if (remaining > 0) setTimeout(tick, 1000);
        }
        tick();
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
