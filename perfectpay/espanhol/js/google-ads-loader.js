/**
 * Google Ads Dynamic Loader
 * Loads gtag.js with the active Conversion ID from the backend.
 * This allows changing Google Ads accounts without code changes.
 */

const GoogleAdsLoader = {
    API_URL: window.ZAPSPY_API_URL || 'https://zapspy-funnel-production.up.railway.app',
    loaded: false,
    config: null,

    detectLanguageFromPage: null,

    getLanguage: function() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/espanhol/') || path.includes('/es/')) return 'es';
        if (path.includes('/portugues/') || path.includes('/pt/')) return 'pt';
        return 'en';
    },

    load: function() {
        if (this.loaded) return;

        const lang = this.getLanguage();

        fetch(`${this.API_URL}/api/gads-config/${lang}`)
            .then(r => r.json())
            .then(data => {
                if (!data.active || !data.conversion_id) {
                    console.log('[GoogleAds] No active config for', lang);
                    return;
                }

                this.config = data;
                this.loaded = true;

                const conversionId = data.conversion_id;

                const gtagScript = document.createElement('script');
                gtagScript.async = true;
                gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
                document.head.appendChild(gtagScript);

                window.dataLayer = window.dataLayer || [];
                window.gtag = function() { window.dataLayer.push(arguments); };
                window.gtag('js', new Date());
                window.gtag('config', conversionId);

                console.log('[GoogleAds] gtag.js loaded with', conversionId);
            })
            .catch(err => {
                console.log('[GoogleAds] Config fetch error:', err.message);
            });
    },

    sendConversion: function(transactionId, value, currency) {
        if (!this.config || !window.gtag) return;

        const sendTo = `${this.config.conversion_id}/${this.config.conversion_label}`;
        window.gtag('event', 'conversion', {
            send_to: sendTo,
            value: value || 0,
            currency: currency || 'USD',
            transaction_id: transactionId || ''
        });
        console.log('[GoogleAds] Conversion sent:', sendTo, 'value:', value, currency);
    }
};

GoogleAdsLoader.load();
