const express = require('express');
const bcrypt = require('bcryptjs'); // For password hashing -- npm install bcryptjs@2.4.3

const router = express.Router();
const tripModel = require('../models/tripModel');


// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};


// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};


// GET Homepage - Show homepage with login status
router.get('/', (req, res) => {
    res.render('pages/homepage', { isHomepage: true, user: req.session.user });
});


// GET Sign Up Page
router.get('/signup', (req, res) => {
    res.render('pages/signup', { isSignupPage: true, isLoginPage: false, isHomepage: false, user: req.session.user });
});


// GET Sign In Page
router.get('/login', (req, res) => {
    res.render('pages/login', { isLoginPage: true, isSignupPage: false, isHomepage: false, user: req.session.user });
});


router.post('/signup', async (req, res) => {
    try {
        console.log("Signup Request Body:", req.body);

        const { name, username, email, password } = req.body;  

        if (!name || !username || !email || !password) {
            console.error("Signup Error: Missing required fields");
            return res.render('pages/signup', { 
                isSignupPage: true, 
                errorMessage: "All fields are required.", 
                user: req.session.user 
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, Number(saltRounds)); 

        tripModel.createUser({ name, username, email, password: hashedPassword }, (err) => {
            if (err) {
                console.error("Database Insert Error:", err);
                return res.render('pages/signup', { 
                    isSignupPage: true, 
                    errorMessage: "Error creating account. Email or username may already exist.", 
                    user: req.session.user 
                });
            }
            res.redirect('/login');
        });

    } catch (err) {
        console.error("Signup Error:", err);
        res.render('pages/signup', { 
            isSignupPage: true, 
            errorMessage: "Internal Server Error. Please try again later.", 
            user: req.session.user 
        });
    }
});



// POST Register
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    tripModel.findUserByEmail(email, (user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.render('pages/login', { 
                isLoginPage: true, 
                errorMessage: "Invalid email or password.", 
                user: req.session.user 
            });
        }
        req.session.user = user;
        res.redirect('/dashboard');
    });
});



// Render Login Page
router.get('/login', (req, res) => {
    res.render('login');
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    tripModel.findUserByEmail(email, async (user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(400).send("Invalid email or password");
        }
        req.session.user = { id: user.id, username: user.username };
        res.redirect('/dashboard');
    });
});



// POST Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// GET Dashboard (Protected)
router.get('/dashboard', requireLogin, (req, res) => {
    tripModel.getAllTrips((trips) => {
        res.render('pages/dashboard', { trips, user: req.session.user });
    });
});


// GET My Trips Page with Filters
router.get('/mytrips', requireLogin, (req, res) => {
    const filters = {
        priority: req.query.priority || null,
        category: req.query.category || null,
        budget: req.query.budget || null,
        start_date: req.query.start_date || null,
        end_date: req.query.end_date || null
    };

    tripModel.getFilteredTrips(filters, (trips) => {
        res.render('pages/mytrips', { 
            trips, 
            filters,
            user: req.session.user
        });
    });
});


// GET Add Trip Page (Pre-filled from Explore Page)
router.get('/add-trip', requireLogin, (req, res) => {
    const { destination } = req.query;
    res.render('templates/addTrip', { destination, user: req.session.user });
});


// POST create a new trip
router.post('/add', requireLogin, (req, res) => {
    const user_id = req.session.user.id; // Get logged-in user ID
    const { destination, start_date, end_date, budget, notes, reminder, priority, category, color } = req.body;

    if (!destination || destination.length < 3 || budget <= 0) {
        return res.status(400).send("Invalid input: Destination must be at least 3 characters, and budget must be positive.");
    }

    tripModel.addTrip({ destination, start_date, end_date, budget, notes, reminder, priority, category, color }, user_id, () => {
        res.redirect('/mytrips');
    });
});


// GET Edit Trip Page
router.get('/edit/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    tripModel.getTripById(id, (trip) => {
        if (!trip) {
            return res.status(404).send("Trip not found");
        }
        res.render('templates/editTrip', { trip, user: req.session.user });
    });
});


// POST Update Trip
router.post('/edit/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    const { destination, start_date, end_date, budget, notes, reminder, priority, category, color } = req.body;

    tripModel.updateTrip(id, { destination, start_date, end_date, budget, notes, reminder, priority, category, color }, () => {
        res.redirect('/mytrips');
    });
});

// POST mark a trip as completed
router.post('/complete/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    tripModel.markTripCompleted(id, () => {
        res.redirect('/mytrips');
    });
});

// POST delete a trip
router.post('/delete/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    tripModel.deleteTrip(id, () => {
        res.redirect('/mytrips');
    });
});

// GET filter trips by category
router.get('/category/:category', (req, res) => {
    const category = req.params.category;
    tripModel.filterTripsByCategory(category, (trips) => {
        res.render('index', { trips });
    });
});

// GET prioritized trips
router.get('/priority', (req, res) => {
    tripModel.getPrioritizedTrips((trips) => {
        res.render('index', { trips });
    });
});

// GET trips by color
router.get('/color/:color', (req, res) => {
    const color = req.params.color;
    tripModel.getTripsByColor(color, (trips) => {
        res.render('index', { trips });
    });
});

// GET Explore Page
router.get('/explore', requireLogin, (req, res) => {
    const suggestedTrips = [
        { destination: 'Paris', best_time: 'Spring', budget: 2000, category: "Europe" },
        { destination: 'Tokyo', best_time: 'Autumn', budget: 2500, category: "Asia" },
        { destination: 'Rome', best_time: 'Summer', budget: 1800, category: "Europe" }
    ];
    res.render('pages/explore', { suggested_trips: suggestedTrips, user: req.session.user });
});

// GET Settings Page
router.get('/settings', requireLogin, (req, res) => {
    res.render('pages/settings', { user: req.session.user });
});

// POST Update Settings
router.post('/update-settings', requireLogin, (req, res) => {
    const { default_currency, notification_pref, theme } = req.body;
    console.log("Settings Updated:", { default_currency, notification_pref, theme });
    res.redirect('/settings');
});


module.exports = router;
