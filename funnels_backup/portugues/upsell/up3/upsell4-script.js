(function(){

    // ============================================
    // VIP PROCESSING OVERLAY - REMOVED FOR BETTER CONVERSION
    // ============================================
    // Overlay removed - content displays immediately
    // Page view is tracked via upsell-tracking.js

    // ============================================
    // COUNTDOWN TIMER
    // ============================================
    const STORAGE_KEY = 'upsell3_timer_end';
    const TIMER_DURATION = 10 * 60; // 10 minutes
    let totalSeconds;
    
    function initTimer() {
        const savedEndTime = localStorage.getItem(STORAGE_KEY);
        if (savedEndTime) {
            const now = Math.floor(Date.now() / 1000);
            const remaining = parseInt(savedEndTime) - now;
            totalSeconds = remaining > 0 ? remaining : 0;
        } else {
            totalSeconds = TIMER_DURATION;
            const endTime = Math.floor(Date.now() / 1000) + totalSeconds;
            localStorage.setItem(STORAGE_KEY, endTime);
        }
    }
    
    function restartTimer() {
        totalSeconds = TIMER_DURATION;
        const endTime = Math.floor(Date.now() / 1000) + totalSeconds;
        localStorage.setItem(STORAGE_KEY, endTime);
    }
    
    var countdownEl = document.getElementById('countdown');
    var countdownCtaEl = document.getElementById('countdown-cta');
    
    function format(seconds){
        if (seconds < 0) seconds = 0;
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    
    function updateTimer() {
        var formatted = format(totalSeconds);
        if (countdownEl) countdownEl.textContent = formatted;
        if (countdownCtaEl) countdownCtaEl.textContent = formatted;
    }
    
    function tick(){
        if (totalSeconds <= 0) {
            restartTimer();
            updateTimer();
            
            // Visual feedback when timer restarts
            var timerBar = document.querySelector('.timer-bar');
            if (timerBar) {
                timerBar.classList.add('timer-restarted');
                setTimeout(function() {
                    timerBar.classList.remove('timer-restarted');
                }, 1000);
            }
            return;
        }
        totalSeconds -= 1;
        updateTimer();
    }
    
    initTimer();
    updateTimer();
    setInterval(tick, 1000);

    // ============================================
    // STATIC ACTIVITY FEED - FIXED LIST OF BUYERS
    // ============================================
    var staticBuyers = [
        { name: 'Ana M.', location: 'São Paulo', action: 'obteve processamento prioritário VIP', time: '2 minutos atrás' },
        { name: 'João D.', location: 'Rio de Janeiro', action: 'pulou a espera de 3 dias', time: '4 minutos atrás' },
        { name: 'Juliana W.', location: 'Belo Horizonte', action: 'desbloqueou resultados instantâneos', time: '5 minutos atrás' },
        { name: 'Carlos R.', location: 'Salvador', action: 'fez upgrade para acesso VIP', time: '7 minutos atrás' },
        { name: 'Fernanda K.', location: 'Brasília', action: 'obteve processamento prioritário VIP', time: '9 minutos atrás' },
        { name: 'Rafael T.', location: 'Curitiba', action: 'pulou a espera de 3 dias', time: '11 minutos atrás' },
        { name: 'Isabella C.', location: 'Recife', action: 'desbloqueou resultados instantâneos', time: '14 minutos atrás' },
        { name: 'Bruno B.', location: 'Fortaleza', action: 'fez upgrade para acesso VIP', time: '16 minutos atrás' },
        { name: 'Sofia L.', location: 'Campinas', action: 'obteve processamento prioritário VIP', time: '18 minutos atrás' },
        { name: 'Daniel H.', location: 'Porto Alegre', action: 'pulou a espera de 3 dias', time: '21 minutos atrás' },
        { name: 'Mariana P.', location: 'Manaus', action: 'desbloqueou resultados instantâneos', time: '24 minutos atrás' },
        { name: 'Lucas G.', location: 'Goiânia', action: 'fez upgrade para acesso VIP', time: '27 minutos atrás' },
        { name: 'Larissa S.', location: 'Florianópolis', action: 'obteve processamento prioritário VIP', time: '31 minutos atrás' },
        { name: 'Matheus N.', location: 'Vitória', action: 'pulou a espera de 3 dias', time: '35 minutos atrás' },
        { name: 'Beatriz F.', location: 'Natal', action: 'desbloqueou resultados instantâneos', time: '38 minutos atrás' }
    ];
    
    var activityFeed = document.getElementById('activityFeed');
    
    function initActivityFeed() {
        if (!activityFeed) return;
        
        // Create all static items with organized layout
        staticBuyers.forEach(function(buyer) {
            var item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = 
                '<span class="activity-icon">✅</span>' +
                '<div class="activity-content">' +
                    '<span class="activity-name">' + buyer.name + ' de ' + buyer.location + '</span>' +
                    '<span class="activity-action">' + buyer.action + '</span>' +
                '</div>' +
                '<span class="activity-time">' + buyer.time + '</span>';
            activityFeed.appendChild(item);
        });
    }
    
    // Initialize feed
    initActivityFeed();

    // ============================================
    // FOOTER YEAR
    // ============================================
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ============================================
    // URGENCY EFFECTS
    // ============================================
    function addUrgencyEffects() {
        var urgencyCard = document.querySelector('.urgency-card');
        if (urgencyCard) {
            urgencyCard.style.animation = 'gentle-glow 2s ease-in-out infinite alternate';
        }
    }

    window.addEventListener('load', addUrgencyEffects);

    // ============================================
    // FADE-IN ANIMATIONS
    // ============================================
    var style = document.createElement('style');
    style.textContent = `
        @keyframes gentle-glow {
            0% { box-shadow: 0 4px 12px rgba(220, 53, 69, 0.1); }
            100% { box-shadow: 0 8px 24px rgba(220, 53, 69, 0.25); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeInUp 0.6s ease forwards; }
    `;
    document.head.appendChild(style);

    var sections = document.querySelectorAll('.testimonial, .benefits, .urgency, .final-cta');
    sections.forEach(function(section, index) {
        section.style.animationDelay = (index * 0.15) + 's';
        section.classList.add('fade-in');
    });


})();
