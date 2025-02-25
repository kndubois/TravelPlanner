const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const tripModel = require('../models/tripModel');

router.get('/', (req, res) => {
    res.render('pages/homepage', { isHomepage: true, user: req.session.user });
});

module.exports = router;
