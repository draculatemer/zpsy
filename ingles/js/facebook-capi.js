/**
 * Facebook Conversions API Client
 * Sends events to server which forwards to Facebook CAPI
 * This complements the browser pixel for better event quality
 */

const FacebookCAPI = {
    API_URL: 'https://zapspy-funnel-production.up.railway.app',
    
    // Get Facebook click ID from URL or cookie
    getFbc: function() {
        // Check URL parameter first (fbclid)
        const urlParams = new URLSearchParams(window.location.search);
        const fbclid = urlParams.get('fbclid');
        if (fbclid) {
            // Format: fb.1.timestamp.fbclid
            const fbc = `fb.1.${Date.now()}.${fbclid}`;
            // Store for future use
            localStorage.setItem('_fbc', fbc);
            return fbc;
        }
        
        // Check localStorage
        const storedFbc = localStorage.getItem('_fbc');
        if (storedFbc) return storedFbc;
        
        // Check cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === '_fbc') return value;
        }
        
        return null;
    },
    
    // Get Facebook browser ID from cookie
    getFbp: function() {
        // Check localStorage first
        const storedFbp = localStorage.getItem('_fbp');
        if (storedFbp) return storedFbp;
        
        // Check cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === '_fbp') return value;
        }
        
        // Generate one if not exists
        const fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 10000000000)}`;
        localStorage.setItem('_fbp', fbp);
        return fbp;
    },
    
    // Get user data from localStorage
    getUserData: function() {
        return {
            email: localStorage.getItem('userEmail'),
            phone: localStorage.getItem('userWhatsApp'),
            firstName: localStorage.getItem('userName'),
            fbc: this.getFbc(),
            fbp: this.getFbp()
        };
    },
    
    // Send event to server CAPI endpoint
    sendEvent: async function(eventName, customData = {}) {
        try {
            const userData = this.getUserData();
            
            const payload = {
                eventName: eventName,
                email: userData.email,
                phone: userData.phone,
                firstName: userData.firstName,
                fbc: userData.fbc,
                fbp: userData.fbp,
                eventSourceUrl: window.location.href,
                ...customData
            };
            
            const response = await fetch(`${this.API_URL}/api/capi/event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                console.log(`✅ CAPI ${eventName} sent successfully`);
            } else {
                console.warn(`⚠️ CAPI ${eventName} failed:`, await response.text());
            }
            
            return response.ok;
        } catch (error) {
            console.error(`❌ CAPI ${eventName} error:`, error);
            return false;
        }
    },
    
    // Predefined events
    trackLead: function(contentName = 'Lead Capture') {
        return this.sendEvent('Lead', {
            contentName: contentName
        });
    },
    
    trackInitiateCheckout: function(value, productName) {
        return this.sendEvent('InitiateCheckout', {
            value: value,
            currency: 'BRL',
            contentName: productName,
            contentType: 'product'
        });
    },
    
    trackViewContent: function(contentName, contentCategory) {
        return this.sendEvent('ViewContent', {
            contentName: contentName,
            contentType: contentCategory
        });
    },
    
    trackAddToCart: function(value, productName) {
        return this.sendEvent('AddToCart', {
            value: value,
            currency: 'BRL',
            contentName: productName,
            contentType: 'product'
        });
    },
    
    // Initialize - store fbc/fbp on page load
    init: function() {
        this.getFbc();
        this.getFbp();
        console.log('📊 Facebook CAPI client initialized');
    }
};

// Auto-initialize
FacebookCAPI.init();
