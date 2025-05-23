require('dotenv').config();

const express = require('express');
const mustacheExpress = require('mustache-express');
const session = require('express-session');
const tripController = require('./src/controllers/tripController');
const db = require('./src/models/tripModel');

const app = express();

app.engine('mustache', mustacheExpress(__dirname + '/src/views/partials'));
app.set('view engine', 'mustache');
app.set('views', __dirname + '/src/views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static('public'));
app.use('/css', express.static(__dirname + '/public/css'));
app.use('/images', express.static(__dirname + '/public/images'));

db.init();  

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.equals = (a, b, options) => (a === b ? options.fn(this) : options.inverse(this));
    next();
});

app.use('/', tripController);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));