/**
 * Application configuration constants
 */

const FB_PIXELS_BY_LANGUAGE = {
    en: [
        {
            id: '726299943423075',
            token: process.env.FB_PIXEL_TOKEN_EN || '',
            name: '[PABLO NOVO] - [SPY INGLES] - [2025]'
        }
    ],
    es: [
        {
            id: '534495082571779',
            token: process.env.FB_PIXEL_TOKEN_ES || '',
            name: 'PIXEL SPY ESPANHOL'
        }
    ],
    pt: [
        {
            id: '820651673268238',
            token: process.env.FB_PIXEL_TOKEN_PT || '',
            name: 'PIXEL SPY PORTUGUES'
        }
    ]
};

const FB_PIXELS = FB_PIXELS_BY_LANGUAGE.en;
const FB_API_VERSION = 'v24.0';

const ALLOWED_ORIGINS = [
    'https://ingles.zappdetect.com',
    'https://espanhol.zappdetect.com',
    'https://perfect.zappdetect.com',
    'https://monetizze.zappdetect.com',
    'https://afiliado.whatstalker.com',
    'https://www.afiliado.whatstalker.com',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5500'
];

if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    ALLOWED_ORIGINS.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}
if (process.env.RAILWAY_STATIC_URL) {
    ALLOWED_ORIGINS.push(process.env.RAILWAY_STATIC_URL.startsWith('http') 
        ? process.env.RAILWAY_STATIC_URL 
        : `https://${process.env.RAILWAY_STATIC_URL}`);
}

const UPSELL_SQL = {
    up1: `(t.product ILIKE '%Message Vault%' OR t.product ILIKE '%349241%' OR t.product ILIKE '%341443%' OR t.product ILIKE '%Recuperación Total%' OR t.product ILIKE '%349261%' OR t.product ILIKE '%341452%')`,
    up2: `(t.product ILIKE '%360%' OR t.product ILIKE '%Tracker%' OR t.product ILIKE '%349242%' OR t.product ILIKE '%341444%' OR t.product ILIKE '%Visión Total%' OR t.product ILIKE '%349266%' OR t.product ILIKE '%341453%')`,
    up3: `(t.product ILIKE '%Instant Access%' OR t.product ILIKE '%349243%' OR t.product ILIKE '%341448%' OR t.product ILIKE '%Sin Esperas%' OR t.product ILIKE '%349267%' OR t.product ILIKE '%341454%')`,
    up4: `(t.product ILIKE '%Behavior Analyst%' OR t.product ILIKE '%Analista de Comportamiento%' OR t.product ILIKE '%349244%' OR t.product ILIKE '%341449%' OR t.product ILIKE '%349268%' OR t.product ILIKE '%341455%')`,
    up5: `(t.product ILIKE '%Live Room%' OR t.product ILIKE '%Camera%' OR t.product ILIKE '%Surveillance%' OR t.product ILIKE '%Cámara%' OR t.product ILIKE '%Vigilancia%')`,
    up6: `(t.product ILIKE '%Multi-Device%' OR t.product ILIKE '%MultiDevice%' OR t.product ILIKE '%Multi Device%' OR t.product ILIKE '%Múltiples Dispositivos%' OR t.product ILIKE '%Multi Dispositivo%')`,
    up7: `(t.product ILIKE '%AI Behavior%' OR t.product ILIKE '%Smart Pattern%' OR t.product ILIKE '%Comportamiento IA%' OR t.product ILIKE '%Patrón Inteligente%')`,
    front: `NOT (t.product ILIKE '%Message Vault%' OR t.product ILIKE '%349241%' OR t.product ILIKE '%341443%' OR t.product ILIKE '%Recuperación Total%' OR t.product ILIKE '%349261%' OR t.product ILIKE '%341452%' OR t.product ILIKE '%360%' OR t.product ILIKE '%Tracker%' OR t.product ILIKE '%349242%' OR t.product ILIKE '%341444%' OR t.product ILIKE '%Visión Total%' OR t.product ILIKE '%349266%' OR t.product ILIKE '%341453%' OR t.product ILIKE '%Instant Access%' OR t.product ILIKE '%349243%' OR t.product ILIKE '%341448%' OR t.product ILIKE '%Sin Esperas%' OR t.product ILIKE '%349267%' OR t.product ILIKE '%341454%' OR t.product ILIKE '%Behavior Analyst%' OR t.product ILIKE '%Analista de Comportamiento%' OR t.product ILIKE '%349244%' OR t.product ILIKE '%341449%' OR t.product ILIKE '%349268%' OR t.product ILIKE '%341455%' OR t.product ILIKE '%Live Room%' OR t.product ILIKE '%Camera%' OR t.product ILIKE '%Surveillance%' OR t.product ILIKE '%Cámara%' OR t.product ILIKE '%Vigilancia%' OR t.product ILIKE '%Multi-Device%' OR t.product ILIKE '%MultiDevice%' OR t.product ILIKE '%Múltiples Dispositivos%' OR t.product ILIKE '%Multi Dispositivo%' OR t.product ILIKE '%AI Behavior%' OR t.product ILIKE '%Smart Pattern%' OR t.product ILIKE '%Comportamiento IA%' OR t.product ILIKE '%Patrón Inteligente%')`
};

const ZAPI_INSTANCE = process.env.ZAPI_INSTANCE_ID || '';
const ZAPI_TOKEN = process.env.ZAPI_TOKEN || '';
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || '';
const ZAPI_BASE_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}`;

// ActiveCampaign Configuration
const AC_API_URL = process.env.AC_API_URL || 'https://matheus0597.api-us1.com';
const AC_API_KEY = process.env.AC_API_KEY || '';

const VALID_PRODUCT_CODES = [
    '341972', '349241', '349242', '349243',
    '330254', '341443', '341444', '341448',
    '349260', '349261', '349266', '349267',
    '338375', '341452', '341453', '341454'
];

module.exports = {
    FB_PIXELS_BY_LANGUAGE,
    FB_PIXELS,
    FB_API_VERSION,
    ALLOWED_ORIGINS,
    UPSELL_SQL,
    ZAPI_INSTANCE,
    ZAPI_TOKEN,
    ZAPI_CLIENT_TOKEN,
    ZAPI_BASE_URL,
    VALID_PRODUCT_CODES,
    AC_API_URL,
    AC_API_KEY
};
