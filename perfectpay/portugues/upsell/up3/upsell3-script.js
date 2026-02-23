(function(){

    // ============================================
    // VIP PROCESSING OVERLAY - REMOVED FOR BETTER CONVERSION
    // ============================================
    // Overlay removed - content displays immediately
    // Page view is tracked via upsell-tracking.js

    // ============================================
    // COUNTDOWN TIMER WITH AUTO-RESTART
    // ============================================
    const STORAGE_KEY = 'upsell2_timer_end';
    const TIMER_DURATION = 12 * 60 + 47; // 12:47
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
    
    function updateAllTimers() {
        var formatted = format(totalSeconds);
        if (countdownEl) countdownEl.textContent = formatted;
        if (countdownCtaEl) countdownCtaEl.textContent = formatted;
    }
    
    function tick(){
        if (totalSeconds <= 0) {
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
    var timer = setInterval(tick, 1000);

    // ============================================
    // DYNAMIC SCARCITY NUMBERS
    // ============================================
    function updateScarcityNumber() {
        var scarcityEl = document.querySelector('.scarcity-text strong');
        if (scarcityEl) {
            var baseNumber = Math.floor(Math.random() * (52 - 24 + 1)) + 24;
            scarcityEl.textContent = baseNumber + ' people';
        }
    }
    
    function scheduleScarcityUpdate() {
        var delay = (Math.floor(Math.random() * 30) + 30) * 1000;
        setTimeout(function() {
            updateScarcityNumber();
            scheduleScarcityUpdate();
        }, delay);
    }
    
    updateScarcityNumber();
    scheduleScarcityUpdate();

    // ============================================
    // FOOTER YEAR
    // ============================================
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ============================================
    // STATIC ACTIVITY FEED - FIXED LIST OF BUYERS
    // ============================================
    var staticBuyers = [
        { name: 'Ana M.', location: 'São Paulo', action: 'desbloqueou todas as redes sociais', time: '2 minutos atrás' },
        { name: 'João D.', location: 'Rio de Janeiro', action: 'adicionou rastreamento GPS', time: '4 minutos atrás' },
        { name: 'Juliana W.', location: 'Belo Horizonte', action: 'fez upgrade para pacote completo', time: '5 minutos atrás' },
        { name: 'Carlos R.', location: 'Salvador', action: 'ativou monitoramento completo', time: '7 minutos atrás' },
        { name: 'Fernanda K.', location: 'Brasília', action: 'desbloqueou todas as redes sociais', time: '9 minutos atrás' },
        { name: 'Rafael T.', location: 'Curitiba', action: 'adicionou rastreamento GPS', time: '11 minutos atrás' },
        { name: 'Isabella C.', location: 'Recife', action: 'fez upgrade para pacote completo', time: '14 minutos atrás' },
        { name: 'Bruno B.', location: 'Fortaleza', action: 'ativou monitoramento completo', time: '16 minutos atrás' },
        { name: 'Sofia L.', location: 'Campinas', action: 'desbloqueou todas as redes sociais', time: '18 minutos atrás' },
        { name: 'Daniel H.', location: 'Porto Alegre', action: 'adicionou rastreamento GPS', time: '21 minutos atrás' },
        { name: 'Mariana P.', location: 'Manaus', action: 'fez upgrade para pacote completo', time: '24 minutos atrás' },
        { name: 'Lucas G.', location: 'Goiânia', action: 'ativou monitoramento completo', time: '27 minutos atrás' },
        { name: 'Larissa S.', location: 'Florianópolis', action: 'desbloqueou todas as redes sociais', time: '31 minutos atrás' },
        { name: 'Matheus N.', location: 'Vitória', action: 'adicionou rastreamento GPS', time: '35 minutos atrás' },
        { name: 'Beatriz F.', location: 'Natal', action: 'fez upgrade para pacote completo', time: '38 minutos atrás' }
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

})();
