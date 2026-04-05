(function() {
    'use strict';

    var DEST = (window.location.pathname.indexOf('/quiz/') !== -1) ? '../bridge.html' : 'bridge.html';
    var TOTAL = 8;
    var ANALYSIS_MS = 10000;

    var LOGS = [
        'Processing digital behavior patterns...',
        'Analyzing phone protection indicators...',
        'Cross-referencing social media activity...',
        'Mapping routine changes...',
        'Evaluating emotional and intimacy patterns...',
        'Detecting guilt compensation signals...',
        'Comparing with 127,493 previous analyses...',
        'Identifying risk level...',
        'Generating personalized diagnosis...'
    ];

    var SIGNAL_MAP = {
        2: { a: 'Extreme phone protection — typical behavior of someone hiding conversations', b: 'Phone always on silent — notification concealment pattern' },
        3: { a: 'Suspicious social media activity — hidden profiles or deleted conversations', b: 'Excessive time on social media without transparency' },
        4: { a: 'Drastic routine change — new and unexplainable excuses', b: 'Small inconsistencies in routine — schedules and stories that don\'t add up' },
        5: { a: 'Emotional coldness and distance in intimacy', b: 'Emotional oscillation — guilt and compensation pattern' },
        6: { a: 'Excessive kindness for no reason — classic guilt compensation behavior', b: 'Isolated moments of apparent guilt' },
        7: { a: 'Provoking conflicts to justify distance', b: 'Increased irritability and impatience for no reason' },
        8: { a: 'Strong intuition that something is being hidden', b: 'Persistent doubt and constant insecurity' }
    };

    var LEVELS = {
        high: {
            label: 'HIGH RISK',
            color: '#ef4444',
            headline: 'Your relationship shows multiple critical signs of infidelity.',
            diag: 'Your answers reveal a <strong>consistent and alarming pattern</strong>. The signs you described appear together in <strong>87% of cases that were confirmed as cheating</strong>. This isn\'t anxiety. It\'s not insecurity. It\'s your instinct recognizing a real pattern — and it\'s almost never wrong.',
            stat: '87%'
        },
        moderate: {
            label: 'MODERATE RISK',
            color: '#f59e0b',
            headline: 'There are concerning signs you can\'t ignore.',
            diag: 'Your profile reveals <strong>moderate but significant signs</strong>. In 64% of cases with this profile, the suspicion was later confirmed. The difference between those who found out in time and those who found out too late was <strong>one decision: act now or wait</strong>.',
            stat: '64%'
        },
        low: {
            label: 'ATTENTION',
            color: '#22c55e',
            headline: 'Few signs detected — but something brought you here.',
            diag: 'The indicators are low, but the fact that you got this far reveals a <strong>doubt that won\'t go away on its own</strong>. In 38% of cases with this profile, something was being hidden. The only way to have peace is to <strong>know for sure</strong>.',
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
            { text: 'Are they ', cls: '' },
            { text: 'hiding', cls: 'word-green' },
            { text: '\n', cls: '' },
            { text: 'something from you', cls: '' },
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
        document.getElementById('topbarLabel').textContent = q + ' of ' + TOTAL;
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
                headEl.textContent = 'Diagnosis almost ready...';
                subEl.textContent = 'Finalizing the result';
                headEl.style.opacity = '1';
                subEl.style.opacity = '1';
            }, 300);
        }, ANALYSIS_MS * 0.55);

        setTimeout(function() {
            headEl.style.opacity = '0';
            subEl.style.opacity = '0';
            setTimeout(function() {
                headEl.textContent = 'Result ready.';
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
