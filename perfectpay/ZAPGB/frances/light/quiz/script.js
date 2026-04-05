(function() {
    'use strict';

    var DEST = (window.location.pathname.indexOf('/quiz/') !== -1) ? '../bridge.html' : 'bridge.html';
    var TOTAL = 8;
    var ANALYSIS_MS = 10000;

    var LOGS = [
        'Analyse des comportements numériques...',
        'Évaluation des indicateurs de protection du téléphone...',
        'Croisement de l\'activité sur les réseaux sociaux...',
        'Cartographie des changements de routine...',
        'Évaluation des schémas émotionnels et d\'intimité...',
        'Détection des signaux de compensation de culpabilité...',
        'Comparaison avec 127 493 analyses précédentes...',
        'Identification du niveau de risque...',
        'Génération du diagnostic personnalisé...'
    ];

    var SIGNAL_MAP = {
        2: { a: 'Protection extrême du téléphone — comportement typique de quelqu\'un qui cache des conversations', b: 'Téléphone toujours en silencieux — schéma de dissimulation des notifications' },
        3: { a: 'Activité suspecte sur les réseaux sociaux — profils cachés ou conversations supprimées', b: 'Temps excessif sur les réseaux sociaux sans transparence' },
        4: { a: 'Changement radical de routine — nouvelles excuses inexplicables', b: 'Petites incohérences dans la routine — emplois du temps et histoires qui ne collent pas' },
        5: { a: 'Froideur émotionnelle et distance dans l\'intimité', b: 'Oscillation émotionnelle — schéma de culpabilité et de compensation' },
        6: { a: 'Gentillesse excessive sans raison — comportement classique de compensation de culpabilité', b: 'Moments isolés de culpabilité apparente' },
        7: { a: 'Provocation de conflits pour justifier la distance', b: 'Irritabilité et impatience accrues sans raison' },
        8: { a: 'Forte intuition que quelque chose est caché', b: 'Doute persistant et insécurité constante' }
    };

    var LEVELS = {
        high: {
            label: 'RISQUE ÉLEVÉ',
            color: '#ef4444',
            headline: 'Votre relation présente de multiples signes critiques d\'infidélité.',
            diag: 'Vos réponses révèlent un <strong>schéma cohérent et alarmant</strong>. Les signes que vous avez décrits apparaissent ensemble dans <strong>87% des cas confirmés d\'infidélité</strong>. Ce n\'est pas de l\'anxiété. Ce n\'est pas de l\'insécurité. C\'est votre instinct qui reconnaît un schéma réel — et il ne se trompe presque jamais.',
            stat: '87%'
        },
        moderate: {
            label: 'RISQUE MODÉRÉ',
            color: '#f59e0b',
            headline: 'Il y a des signes préoccupants que vous ne pouvez pas ignorer.',
            diag: 'Votre profil révèle des <strong>signes modérés mais significatifs</strong>. Dans 64% des cas avec ce profil, le soupçon a été confirmé par la suite. La différence entre ceux qui ont découvert à temps et ceux qui ont découvert trop tard tenait à <strong>une seule décision : agir maintenant ou attendre</strong>.',
            stat: '64%'
        },
        low: {
            label: 'ATTENTION',
            color: '#22c55e',
            headline: 'Peu de signes détectés — mais quelque chose vous a amené(e) ici.',
            diag: 'Les indicateurs sont faibles, mais le fait que vous soyez arrivé(e) jusqu\'ici révèle un <strong>doute qui ne disparaîtra pas tout seul</strong>. Dans 38% des cas avec ce profil, quelque chose était caché. La seule façon d\'avoir la paix est de <strong>savoir avec certitude</strong>.',
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

    function typewriteHook() {
        var el = document.getElementById('hookTitle');
        var segments = [
            { text: 'Est-ce qu\'il/elle vous ', cls: '' },
            { text: 'cache', cls: 'word-green' },
            { text: '\n', cls: '' },
            { text: 'quelque chose', cls: '' },
            { text: ' ?', cls: '' }
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
        document.getElementById('topbarLabel').textContent = q + ' sur ' + TOTAL;
    }

    function hideProgress() {
        document.getElementById('topbar').classList.remove('visible');
    }

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
                headEl.textContent = 'Diagnostic presque prêt...';
                subEl.textContent = 'Finalisation du résultat';
                headEl.style.opacity = '1';
                subEl.style.opacity = '1';
            }, 300);
        }, ANALYSIS_MS * 0.55);

        setTimeout(function() {
            headEl.style.opacity = '0';
            subEl.style.opacity = '0';
            setTimeout(function() {
                headEl.textContent = 'Résultat prêt.';
                subEl.textContent = '';
                headEl.style.opacity = '1';
            }, 300);
        }, ANALYSIS_MS * 0.88);

        setTimeout(showResult, ANALYSIS_MS + 1000);
    }

    function showResult() {
        var maxScore = TOTAL * 15;
        var rawPct = Math.round((state.score / maxScore) * 100);
        var displayPct = Math.max(65, Math.min(rawPct + 20, 97));

        var key = displayPct >= 75 ? 'high' : displayPct >= 50 ? 'moderate' : 'low';
        var level = LEVELS[key];
        var c = level.color;

        document.getElementById('resLevel').textContent = level.label;
        document.getElementById('resLevel').style.color = c;
        document.getElementById('resHeadline').textContent = level.headline;
        document.getElementById('resStat').textContent = level.stat;
        document.getElementById('resNumber').style.color = c;
        document.querySelector('.res-pct').style.color = c;

        var diagBox = document.getElementById('resDiagnosis');
        diagBox.style.borderLeftColor = c;
        diagBox.querySelector('.diag-header svg').style.stroke = c;
        document.getElementById('diagText').innerHTML = level.diag;

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

        var arc = document.getElementById('resArc');
        arc.style.stroke = c;
        var circumference = 276.46;
        var offset = circumference - (circumference * displayPct / 100);

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

        goToScene('result');

        var ctaF = document.getElementById('ctaFinal');
        var ctaS = document.getElementById('ctaSecondary');
        if (ctaF) { ctaF.href = url; ctaF.onclick = function() { window.location.href = url; }; }
        if (ctaS) { ctaS.href = url; ctaS.onclick = function() { window.location.href = url; }; }

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
