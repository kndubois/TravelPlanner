const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();
const tripModel = require('../models/tripModel');


const formatDate = (dateString) => {
    if (!dateString || isNaN(new Date(dateString))) return 'N/A';
    const date = new Date(dateString);
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};



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



// logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// POST Logout 
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});


// GET Dashboard (Protected)
router.get('/dashboard', requireLogin, (req, res) => {
    tripModel.getAllTrips((trips) => {

        const today = new Date();

        trips.forEach(trip => {
            trip.budget = formatCommas(trip.budget);

            const startDate = new Date(trip.start_date);
            const endDate = new Date(trip.end_date);
            
            trip.start_date = formatDate(trip.start_date);
            trip.end_date = formatDate(trip.end_date);

            trip.is_completed = trip.completed === 1 || endDate < today;
            trip.duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

            trip.destination_name = trip.destination_name || trip.destination; 
        });

        const ongoingTrips = trips.filter(trip => !trip.is_completed && new Date(trip.start_date) <= today && new Date(trip.end_date) >= today);
        const upcomingTrips = trips.filter(trip => !trip.is_completed && new Date(trip.start_date) > today);
        const completedTrips = trips.filter(trip => trip.is_completed); 

        ongoingTrips.forEach(trip => {
            trip.start_date = formatDate(trip.start_date);
            trip.end_date = formatDate(trip.end_date);
        });

        upcomingTrips.forEach(trip => {
            trip.start_date = formatDate(trip.start_date);
            trip.end_date = formatDate(trip.end_date);
        });

        completedTrips.forEach(trip => {
            trip.start_date = formatDate(trip.start_date);
            trip.end_date = formatDate(trip.end_date);
        });

        const ongoingTripsLimited = ongoingTrips.slice(0, 3);
        const upcomingTripsLimited = upcomingTrips.slice(0, 3);
        const completedTripsLimited = completedTrips.slice(0, 3);

        const reminders = trips
        .filter(trip => trip.reminder && trip.reminder.trim() !== "")
        .map(trip => ({ 
            destination_name: trip.destination_name || trip.destination, 
            start_date: trip.start_date
        }));
    

        res.render('pages/dashboard', {
            trips,
            ongoing_trips: ongoingTrips,
            upcoming_trips: upcomingTrips,
            completed_trips: completedTrips,
            ongoing_trips_limited: ongoingTripsLimited, 
            upcoming_trips_limited: upcomingTripsLimited,
            completed_trips_limited: completedTripsLimited, 
            next_trip: upcomingTrips.length > 0 ? upcomingTrips[0] : null,
            reminders,
            trip_count: trips.length,
            total_budget: formatCommas(trips.reduce((sum, trip) => sum + parseFloat(trip.budget.toString().replace(/[^0-9.]/g, '')) || 0, 0)),
            total_spent: formatCommas(trips.reduce((sum, trip) => sum + (trip.total_spent || 0), 0)),
            user: req.session.user
        });
    });
});



// GET My Trips Page with Filters
router.get('/mytrips', requireLogin, (req, res) => {
    const filters = {
        priority: req.query.priority || null,
        category: req.query.category || null,
        budget: req.query.budget || null,
        start_date: req.query.start_date || null,
        end_date: req.query.end_date || null,
        status: req.query.status || null
    };
    

    tripModel.getFilteredTrips(filters, (trips) => {
        const today = new Date();

        trips.forEach(trip => {
            const startDate = new Date(trip.start_date);
            const endDate = new Date(trip.end_date);
        
            trip.start_date = formatDate(trip.start_date);
            trip.end_date = formatDate(trip.end_date);
            trip.destination_name = trip.destination_name || trip.destination; 
        
            trip.is_completed = trip.completed === 1 || endDate < today;
            trip.is_ongoing = !trip.is_completed && startDate <= today && endDate >= today;
            trip.is_upcoming = !trip.is_completed && startDate > today;

            if (filters.status) {
                if (filters.status === "ongoing" && !trip.is_ongoing) return false;
                if (filters.status === "upcoming" && !trip.is_upcoming) return false;
                if (filters.status === "completed" && !trip.is_completed) return false;
            }

            if (filters.start_date && startDate.getTime() !== new Date(filters.start_date).getTime()) return false;
            if (filters.end_date && endDate.getTime() !== new Date(filters.end_date).getTime()) return false;

            return true;
        });
        

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
    let { destination, start_date, end_date, budget, notes, reminder, priority, category } = req.body;


    if (!destination || destination.length < 3 || budget <= 0) {
        return res.status(400).send("Invalid input: Destination must be at least 3 characters, and budget must be positive.");
    }

    if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).send("Error: End date cannot be before start date.");
    }

    tripModel.addTrip({ destination, start_date, end_date, budget, notes, reminder, priority, category }, user_id, () => {
        res.redirect('/mytrips');
    });
});


const formatCommas = (number) => { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(number); };

// GET Itinerary Page
router.get('/itinerary/:id', requireLogin, (req, res) => {
    const tripId = req.params.id;

    tripModel.getTripById(tripId, (trip) => {
        if (!trip) {
            return res.status(404).send("Trip not found");
        }

        // Fetch schedule data for the trip
        tripModel.getScheduleByTripId(tripId, (schedule) => {
            trip.schedule = schedule || []; 

            // Format schedule dates
            trip.schedule = trip.schedule.map(item => ({
                ...item,
                formatted_date: formatDate(item.date)  
            }));

            // Fetch bookings data
            tripModel.getBookingsByTripId(tripId, (bookings) => {
                trip.bookings = bookings || [];  

                const itineraryData = {
                    id: trip.id,
                    destination: trip.destination,
                    destination_name: trip.destination_name || trip.destination,
                    start_date: formatDate(trip.start_date),
                    end_date: formatDate(trip.end_date),
                    duration: Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24)),
                    budget: formatCommas(trip.budget),
                    category: trip.category || "Uncategorized",
                    priority: trip.priority,
                    notes: trip.notes || "",
                    reminder: trip.reminder || "No reminder set.",
                    total_spent: formatCommas(trip.total_spent || 0),
                    remaining_budget: formatCommas(trip.budget - (trip.total_spent || 0)),
                    schedule: trip.schedule || [],
                    bookings: trip.bookings || [],
                    tasks: [...(trip.packing_list || []), ...(trip.todo_list || [])],
                    user: req.session.user
                };

                res.render('pages/itinerary', itineraryData);
            });
        });
    });
});


router.post('/itinerary/:id/add-schedule', requireLogin, (req, res) => {
    const tripId = req.params.id;
    const { date, activities } = req.body;

    tripModel.addScheduleItem(tripId, { date, activities }, (success) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to add schedule." });
        }
        res.json({ success: true, message: "Schedule added successfully." });
    });
});


router.post('/itinerary/:id/edit-schedule/:scheduleId', requireLogin, (req, res) => {
    const { scheduleId } = req.params;
    const { date, activities } = req.body;

    tripModel.updateSchedule(scheduleId, { date, activities }, (success) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to update schedule." });
        }
        res.json({ success: true, message: "Schedule updated successfully." });
    });
});

router.post('/itinerary/:id/delete-schedule/:scheduleId', requireLogin, (req, res) => {
    const { scheduleId } = req.params;

    tripModel.deleteSchedule(scheduleId, (success) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to delete schedule." });
        }
        res.json({ success: true, message: "Schedule deleted successfully." });
    });
});


router.post('/itinerary/:id/add-booking', requireLogin, (req, res) => {
    const tripId = req.params.id;
    const { type, details } = req.body;

    tripModel.addBooking(tripId, { type, details }, (success, bookingId) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to add booking." });
        }
        res.json({ success: true, id: bookingId, type, details });
    });
});


router.post('/itinerary/:id/edit-booking/:bookingId', requireLogin, (req, res) => {
    const { bookingId } = req.params;
    const { type, details } = req.body;

    tripModel.updateBooking(bookingId, { type, details }, (success) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to update booking." });
        }
        res.json({ success: true, message: "Booking updated successfully." });
    });
});

router.post('/itinerary/:id/delete-booking/:bookingId', requireLogin, (req, res) => {
    const { bookingId } = req.params;

    tripModel.deleteBooking(bookingId, (success) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to delete booking." });
        }
        res.json({ success: true, message: "Booking deleted successfully." });
    });
});


router.post('/itinerary/:id/add-task', requireLogin, (req, res) => {
    const tripId = req.params.id;
    const { item } = req.body;

    tripModel.addTask(tripId, { item }, () => {
        res.json({ success: true, item });
    });
});


router.post('/itinerary/:id/edit-task/:taskId', requireLogin, (req, res) => {
    const { taskId } = req.params;
    const { item } = req.body;

    tripModel.updateTask(taskId, { item }, () => {
        res.redirect(`/itinerary/${req.params.id}`);
    });
});

// GET Edit Trip Page
router.get('/edit/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    const success = req.query.success === "true";
    const error = req.query.error === "true";
    const from = req.query.from || "";
    const from_itinerary = req.query.from === "itinerary";
    const from_mytrips = req.query.from === "mytrips";

    tripModel.getTripById(id, (trip) => {
        if (!trip) {
            return res.status(404).send("Trip not found");
        }
        res.render('templates/editTrip', { trip, success, error, from_itinerary, from_mytrips, from, user: req.session.user });
    });
});


router.post('/edit/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    const { destination_name, destination, start_date, end_date, budget, notes, reminder, priority, category } = req.body;
    const from = req.query.from || req.body.from || ""; 

    tripModel.updateTrip(id, { destination_name, destination, start_date, end_date, budget, notes, reminder, priority, category }, (err) => {
        if (err) {
            return res.redirect(`/edit/${id}?error=true&from=${from}`);
        }
        res.redirect(`/edit/${id}?success=true&from=${from}`);
    });
});




// POST mark a trip as completed
router.post('/complete/:id', requireLogin, (req, res) => {
    const id = req.params.id;

    tripModel.getTripById(id, (trip) => {
        if (!trip) {
            return res.status(404).send("Trip not found");
        }

        const today = new Date();
        const endDate = new Date(trip.end_date);

        // ✅ Only mark a trip as completed if today is AFTER the end date
        if (today < endDate) {
            return res.status(400).send("Error: You cannot mark a trip as completed before it ends.");
        }

        tripModel.markTripCompleted(id, () => {
            res.redirect('/mytrips');
        });
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


// GET Explore Page
router.get('/explore', requireLogin, (req, res) => {
    const suggestedTrips = [
        { destination: 'Paris', best_time: 'Spring', budget: formatCommas(2000), category: "Europe",image: "/images/paris.jpg"  },
        { destination: 'Tokyo', best_time: 'Autumn', budget: formatCommas(2500), category: "Asia", image: "/images/tokyo.jpg"  },
        { destination: 'Rome', best_time: 'Summer', budget: formatCommas(1800), category: "Europe", image: "/images/rome.jpg"  },
        { destination: 'New York', best_time: 'Winter', budget: formatCommas(2200), category: "USA", image: "/images/newyork.jpg" },
        { destination: 'Miami', best_time: 'Winter', budget: formatCommas(2000), category: "USA", image: "/images/miami.jpg" },
        { destination: 'Sydney', best_time: 'Spring', budget: formatCommas(2700), category: "Australia", image: "/images/sydney.jpg" }
    ];    
    
    res.render('pages/explore', { suggested_trips: suggestedTrips, user: req.session.user });
});

// GET Settings Page

router.get('/settings', requireLogin, (req, res) => {
    tripModel.getUserById(req.session.user.id, (user) => {
        if (!user) return res.redirect('/login');
        res.render('pages/settings', { user: req.session.user });
    });
});

// POST Update Settings
router.post('/update-settings', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    const { name, username, email, password, default_currency, timezone, theme, language } = req.body;

    let hashedPassword = null;
    if (password) {
        const saltRounds = 10;
        hashedPassword = await bcrypt.hash(password, Number(saltRounds));
    }

    tripModel.updateUser(userId, { name, username, email, hashedPassword, default_currency, timezone, theme, language }, (err) => {
        if (err) return res.redirect('/settings?error=true');

        req.session.user.username = username;

        res.redirect('/settings?success=true');
    });
});


// GET Travel Tips Page
router.get('/tips', (req, res) => {
    const tips = [
        { title: "Pack Smart", category: "packing", content: "Roll your clothes to save space and avoid wrinkles." },
        { title: "Save Money on Flights", category: "budget", content: "Book flights on weekdays for the best prices." },
        { title: "Stay Safe While Traveling", category: "safety", content: "Avoid showing valuables in crowded areas." },
        { title: "Learn Basic Local Phrases", category: "local", content: "Knowing a few local phrases can help in emergencies." }
    ];

    res.render('pages/tips', { tips, user: req.session.user });
});



module.exports = router;
