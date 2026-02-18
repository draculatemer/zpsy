/**
 * IP Geolocation service using ip-api.com
 */
const http = require('http');

async function getCountryFromIP(ip) {
    return new Promise((resolve) => {
        try {
            if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
                console.log('Geolocation: Skipping private/local IP:', ip);
                return resolve({ country: null, country_code: null, city: null });
            }
            
            let cleanIP = ip;
            if (ip.startsWith('::ffff:')) {
                cleanIP = ip.substring(7);
            }
            
            console.log('Geolocation: Looking up IP:', cleanIP);
            
            const url = `http://ip-api.com/json/${cleanIP}?fields=status,country,countryCode,city,regionName`;
            
            http.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        
                        if (json.status === 'success') {
                            console.log('Geolocation: Found -', json.country, json.countryCode, json.city, json.regionName);
                            resolve({
                                country: json.country || null,
                                country_code: json.countryCode || null,
                                city: json.city || null,
                                state: json.regionName || null
                            });
                        } else {
                            console.log('Geolocation: API returned fail status');
                            resolve({ country: null, country_code: null, city: null, state: null });
                        }
                    } catch (parseError) {
                        console.log('Geolocation parse error:', parseError.message);
                        resolve({ country: null, country_code: null, city: null, state: null });
                    }
                });
            }).on('error', (error) => {
                console.log('Geolocation request error:', error.message);
                resolve({ country: null, country_code: null, city: null, state: null });
            });
            
        } catch (error) {
            console.log('Geolocation error:', error.message);
            resolve({ country: null, country_code: null, city: null, state: null });
        }
    });
}

module.exports = { getCountryFromIP };
