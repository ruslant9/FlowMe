// backend/routes/user/locations.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const countries = require('../../data/countries.json');
const allCities = require('../../data/cities.json');

router.get('/countries', authMiddleware, (req, res) => {
    const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    res.json(sortedCountries);
});

router.get('/cities', authMiddleware, (req, res) => {
    const { countryCode, search = '', page = 1 } = req.query;
    const limit = 10;
    if (!countryCode) return res.status(400).json({ message: 'Необходимо указать код страны (countryCode).' });
    let filteredCities = allCities.filter(city => city.country === countryCode);
    if (search) {
        const lowerCaseSearch = search.toLowerCase();
        filteredCities = filteredCities.filter(city => city.name.toLowerCase().includes(lowerCaseSearch));
    }
    filteredCities.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCities = filteredCities.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredCities.length;
    res.json({
        cities: paginatedCities.map(c => c.name),
        hasMore
    });
});

module.exports = router;