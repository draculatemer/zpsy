(function(){

    // ============================================
    // VIP PROCESSING OVERLAY - REMOVED FOR BETTER CONVERSION
    // ============================================
    // Overlay removed - content displays immediately
    // Page view is tracked via upsell-tracking.js

    // ============================================
    // AUTO-PURCHASE MONETIZZE UPSELL
    // ============================================
    // Automatically redirects to the Monetizze purchase URL
    // Bypasses iframe click by constructing the direct URL
    
    var autoClickExecuted = false;
    
    function getCustomerData() {
        // Try to get customer data from localStorage (saved during checkout)
        var data = {
            nome: '',
            email: '',
            telefone: ''
        };
        
        try {
            // Try different localStorage keys that might contain user data
            data.email = localStorage.getItem('userEmail') || 
                         localStorage.getItem('customerEmail') || 
                         localStorage.getItem('email') || '';
            
            data.nome = localStorage.getItem('userName') || 
                        localStorage.getItem('customerName') || 
                        localStorage.getItem('name') || '';
            
            data.telefone = localStorage.getItem('userWhatsApp') || 
                           localStorage.getItem('customerPhone') || 
                           localStorage.getItem('phone') || 
                           localStorage.getItem('targetPhone') || '';
            
            // Clean phone number (remove non-digits except +)
            if (data.telefone) {
                data.telefone = data.telefone.replace(/[^\d+]/g, '');
            }
        } catch(e) {
            console.log('⚠️ Could not get customer data from localStorage:', e);
        }
        
        // Also try to get from URL parameters (if passed from previous page)
        try {
            var urlParams = new URLSearchParams(window.location.search);
            if (!data.email && urlParams.get('email')) data.email = urlParams.get('email');
            if (!data.nome && urlParams.get('nome')) data.nome = urlParams.get('nome');
            if (!data.nome && urlParams.get('name')) data.nome = urlParams.get('name');
            if (!data.telefone && urlParams.get('telefone')) data.telefone = urlParams.get('telefone');
            if (!data.telefone && urlParams.get('phone')) data.telefone = urlParams.get('phone');
        } catch(e) {
            console.log('⚠️ Could not parse URL params:', e);
        }
        
        return data;
    }
    
    function getUTMParams() {
        var utms = {
            utm_source: 'zapspy',
            utm_medium: 'funnel',
            utm_campaign: 'upsell2_auto'
        };
        
        try {
            var urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('utm_source')) utms.utm_source = urlParams.get('utm_source');
            if (urlParams.get('utm_medium')) utms.utm_medium = urlParams.get('utm_medium');
            if (urlParams.get('utm_campaign')) utms.utm_campaign = urlParams.get('utm_campaign');
            if (urlParams.get('utm_content')) utms.utm_content = urlParams.get('utm_content');
            if (urlParams.get('utm_term')) utms.utm_term = urlParams.get('utm_term');
        } catch(e) {}
        
        return utms;
    }
    
    function buildMonetizzeUrl(upsellKey) {
        // Base URL for Monetizze upsell
        var baseUrl = 'https://obrigado.monetizze.com.br/';
        
        // Get customer data and UTMs
        var customer = getCustomerData();
        var utms = getUTMParams();
        
        // Build query parameters
        var params = new URLSearchParams();
        params.append('c', upsellKey);
        params.append('fb_pixel', ''); // Empty, will be filled by Monetizze
        
        // Add UTMs
        Object.keys(utms).forEach(function(key) {
            if (utms[key]) params.append(key, utms[key]);
        });
        
        // Add customer data if available
        if (customer.nome) params.append('nome', customer.nome);
        if (customer.email) params.append('email', customer.email);
        if (customer.telefone) params.append('telefone', customer.telefone);
        
        var fullUrl = baseUrl + '?' + params.toString();
        console.log('🔗 Built Monetizze URL:', fullUrl);
        
        return fullUrl;
    }
    
    function autoClickMonetizzeButton() {
        if (autoClickExecuted) return;
        
        var iframe = document.querySelector('iframe.iframeUpsell');
        if (!iframe) {
            console.log('⏳ Monetizze iframe not found');
            return false;
        }
        
        // Get the Monetizze upsell key from the iframe
        var upsellKey = iframe.getAttribute('data-chave');
        
        if (!upsellKey) {
            console.log('⚠️ No upsell key found in iframe');
            return false;
        }
        
        console.log('🎯 Found upsell key:', upsellKey);
        
        // Build the direct Monetizze purchase URL
        var monetizzeUrl = buildMonetizzeUrl(upsellKey);
        
        console.log('🚀 Auto-redirecting to Monetizze purchase...');
        
        // Mark as executed to prevent multiple redirects
        autoClickExecuted = true;
        
        // Redirect to the purchase page
        window.location.href = monetizzeUrl;
        return true;
    }
    
    // Wait for page to be ready then auto-redirect
    function initAutoClick() {
        var attempts = 0;
        var maxAttempts = 10; // Try for up to 5 seconds
        
        var checkInterval = setInterval(function() {
            attempts++;
            
            var iframe = document.querySelector('iframe.iframeUpsell');
            
            // Check if iframe exists and has the data-chave attribute
            if (iframe && iframe.getAttribute('data-chave')) {
                console.log('✅ Iframe with upsell key found, initiating auto-purchase...');
                
                // Small delay before redirecting
                setTimeout(function() {
                    autoClickMonetizzeButton();
                }, 500);
                
                clearInterval(checkInterval);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.log('⚠️ Auto-click timed out - iframe did not initialize');
                clearInterval(checkInterval);
            }
        }, 500);
    }
    
    // Start auto-click process when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Small delay to let Monetizze script initialize
            setTimeout(initAutoClick, 800);
        });
    } else {
        setTimeout(initAutoClick, 800);
    }

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
    // LIVE ACTIVITY FEED - REALISTIC & ANIMATED
    // ============================================
    var firstNames = [
        'Sarah', 'John', 'Maria', 'David', 'Anna', 'Michael', 'Emma', 'James',
        'Sofia', 'William', 'Isabella', 'Lucas', 'Olivia', 'Daniel', 'Mia',
        'Gabriel', 'Emily', 'Matthew', 'Ava', 'Andrew', 'Jessica', 'Ryan',
        'Jennifer', 'Carlos', 'Amanda', 'Pedro', 'Rachel', 'Luis', 'Nicole',
        'Ashley', 'Brandon', 'Christina', 'Derek', 'Elena', 'Frank', 'Grace'
    ];
    
    var locations = [
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
        'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
        'Fort Worth', 'Columbus', 'Charlotte', 'Seattle', 'Denver', 'Boston',
        'Nashville', 'Detroit', 'Portland', 'Las Vegas', 'Atlanta', 'Miami'
    ];
    
    var actions = [
        'unlocked all social networks',
        'added GPS tracking',
        'upgraded to complete package',
        'activated full monitoring'
    ];
    
    var activityFeed = document.getElementById('activityFeed');
    
    function getRandomTime() {
        var rand = Math.random();
        if (rand < 0.3) {
            return Math.floor(Math.random() * 60) + ' seconds ago';
        } else if (rand < 0.7) {
            return (Math.floor(Math.random() * 5) + 1) + ' minutes ago';
        } else {
            return (Math.floor(Math.random() * 10) + 5) + ' minutes ago';
        }
    }
    
    function getRandomName() {
        var name = firstNames[Math.floor(Math.random() * firstNames.length)];
        var lastInitial = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        return name + ' ' + lastInitial + '.';
    }
    
    function getRandomLocation() {
        return locations[Math.floor(Math.random() * locations.length)];
    }
    
    function getRandomAction() {
        return actions[Math.floor(Math.random() * actions.length)];
    }
    
    function createActivityItem(isNew) {
        var name = getRandomName();
        var location = getRandomLocation();
        var time = getRandomTime();
        var action = getRandomAction();
        
        var item = document.createElement('div');
        item.className = 'activity-item' + (isNew ? ' new-item' : '');
        item.innerHTML = '<span class="activity-icon">✅</span> <strong>' + name + '</strong> from ' + location + ' ' + action + ' <span class="activity-time">' + time + '</span>';
        
        return item;
    }
    
    function initActivityFeed() {
        if (!activityFeed) return;
        
        // Create initial 3 items
        for (var i = 0; i < 3; i++) {
            var item = createActivityItem(false);
            activityFeed.appendChild(item);
        }
    }
    
    function addNewActivity() {
        if (!activityFeed) return;
        
        // Create new item with animation
        var newItem = createActivityItem(true);
        activityFeed.insertBefore(newItem, activityFeed.firstChild);
        
        // Remove animation class after animation completes
        setTimeout(function() {
            newItem.classList.remove('new-item');
        }, 600);
        
        // Keep only 3 items visible
        var items = activityFeed.querySelectorAll('.activity-item');
        if (items.length > 3) {
            var lastItem = items[items.length - 1];
            lastItem.style.opacity = '0';
            lastItem.style.transform = 'translateX(20px)';
            setTimeout(function() {
                if (lastItem.parentNode) {
                    lastItem.parentNode.removeChild(lastItem);
                }
            }, 300);
        }
    }
    
    function scheduleActivityUpdate() {
        // Random delay between 8-20 seconds
        var delay = (Math.floor(Math.random() * 12) + 8) * 1000;
        setTimeout(function() {
            addNewActivity();
            scheduleActivityUpdate();
        }, delay);
    }
    
    // Initialize feed and start updates
    initActivityFeed();
    scheduleActivityUpdate();

    // ============================================
    // PREVENT PAGE EXIT
    // ============================================
    var isProcessingPayment = false;
    
    window.addEventListener('beforeunload', function (e) {
        if (isProcessingPayment) {
            e.preventDefault();
            e.returnValue = 'Your payment is being processed! Please do not leave this page.';
            return e.returnValue;
        }
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? You may lose your special upgrade offer!';
        return e.returnValue;
    });

    // ============================================
    // LOADING OVERLAY ON CTA CLICK - DISABLED
    // ============================================
    // Loading overlay removed to avoid interfering with Monetizze 1-click processing
    
    var ctaButtons = document.querySelectorAll('.btn-primary[data-upsell]');
    
    ctaButtons.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            // Just mark as processing for beforeunload warning
            isProcessingPayment = true;
        });
    });

})();
