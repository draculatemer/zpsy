const express = require('express');
const router = express.Router();
const { zapiRequest } = require('../services/zapi');

router.get('/phone-exists/:phone', async (req, res) => {
    try {
        const result = await zapiRequest(`phone-exists/${req.params.phone}`);
        if (result.ok) {
            res.json(result.data);
        } else {
            res.json({ exists: true });
        }
    } catch (error) {
        console.error(`Z-API phone-exists exception:`, error.message);
        res.json({ exists: true });
    }
});

router.get('/profile-picture/:phone', async (req, res) => {
    try {
        const result = await zapiRequest(`profile-picture?phone=${req.params.phone}`);
        res.json(result.ok ? result.data : { link: null });
    } catch (error) {
        console.error(`Z-API profile-picture exception:`, error.message);
        res.json({ link: null });
    }
});

module.exports = router;
