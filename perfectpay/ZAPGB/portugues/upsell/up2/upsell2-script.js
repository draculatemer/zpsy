(function(){

    // ============================================
    // VIP PROCESSING OVERLAY - REMOVED
    // Content now displays directly for better conversion
    // ============================================
    
    // ============================================
    // COUNTDOWN TIMER WITH AUTO-RESTART
    // ============================================
    const STORAGE_KEY = 'upsell_timer_end';
    const TIMER_DURATION = 15 * 60; // 15 minutes
    let totalSeconds;
    let timer;
    
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
    
    const countdownEl = document.getElementById('countdown');
    const countdownCtaEl = document.getElementById('countdown-cta');
    
    function format(seconds){
        if (seconds < 0) seconds = 0;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    
    function updateAllTimers() {
        const formatted = format(totalSeconds);
        if (countdownEl) countdownEl.textContent = formatted;
        if (countdownCtaEl) countdownCtaEl.textContent = formatted;
    }
    
    function tick(){
        if (totalSeconds <= 0) {
            // Auto-restart timer when it expires
            restartTimer();
            updateAllTimers();
            
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
        updateAllTimers();
    }
    
    initTimer();
    updateAllTimers();
    timer = setInterval(tick, 1000);

    // ============================================
    // DYNAMIC SCARCITY NUMBERS
    // ============================================
    function updateScarcityNumber() {
        const scarcityEl = document.querySelector('.scarcity-text strong');
        if (scarcityEl) {
            // Random number between 31 and 89
            const baseNumber = Math.floor(Math.random() * (89 - 31 + 1)) + 31;
            scarcityEl.textContent = baseNumber + ' pessoas';
        }
    }
    
    // Update scarcity every 30-60 seconds randomly
    function scheduleScarcityUpdate() {
        const delay = (Math.floor(Math.random() * 30) + 30) * 1000;
        setTimeout(function() {
            updateScarcityNumber();
            scheduleScarcityUpdate();
        }, delay);
    }
    
    updateScarcityNumber();
    scheduleScarcityUpdate();

    // ============================================
    // STATIC ACTIVITY FEED - FIXED LIST OF BUYERS
    // ============================================
    const staticBuyers = [
        { name: 'Ana M.', location: 'São Paulo', action: 'desbloqueou acesso', time: '2 minutos atrás' },
        { name: 'João D.', location: 'Rio de Janeiro', action: 'recuperou mensagens', time: '4 minutos atrás' },
        { name: 'Juliana W.', location: 'Belo Horizonte', action: 'acabou de ativar', time: '5 minutos atrás' },
        { name: 'Carlos R.', location: 'Salvador', action: 'desbloqueou acesso', time: '7 minutos atrás' },
        { name: 'Fernanda K.', location: 'Brasília', action: 'recuperou mensagens', time: '9 minutos atrás' },
        { name: 'Rafael T.', location: 'Curitiba', action: 'acabou de ativar', time: '11 minutos atrás' },
        { name: 'Isabella C.', location: 'Recife', action: 'desbloqueou acesso', time: '14 minutos atrás' },
        { name: 'Bruno B.', location: 'Fortaleza', action: 'recuperou mensagens', time: '16 minutos atrás' },
        { name: 'Sofia L.', location: 'Campinas', action: 'acabou de ativar', time: '18 minutos atrás' },
        { name: 'Daniel H.', location: 'Porto Alegre', action: 'desbloqueou acesso', time: '21 minutos atrás' },
        { name: 'Mariana P.', location: 'Manaus', action: 'recuperou mensagens', time: '24 minutos atrás' },
        { name: 'Lucas G.', location: 'Goiânia', action: 'acabou de ativar', time: '27 minutos atrás' },
        { name: 'Larissa S.', location: 'Florianópolis', action: 'desbloqueou acesso', time: '31 minutos atrás' },
        { name: 'Matheus N.', location: 'Vitória', action: 'recuperou mensagens', time: '35 minutos atrás' },
        { name: 'Beatriz F.', location: 'Natal', action: 'acabou de ativar', time: '38 minutos atrás' }
    ];
    
    const activityFeed = document.getElementById('activityFeed');
    
    function initActivityFeed() {
        if (!activityFeed) return;
        
        // Create all static items with organized layout
        staticBuyers.forEach(function(buyer) {
            const item = document.createElement('div');
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
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ============================================
    // SMOOTH SCROLL TO PURCHASE
    // ============================================
    var scrollLinks = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < scrollLinks.length; i++) {
        scrollLinks[i].addEventListener('click', function (e) {
            var href = this.getAttribute('href');
            if (href === '#' || href.startsWith('https://go.centerpag.com')) return;
            
            e.preventDefault();
            var target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }

})();
