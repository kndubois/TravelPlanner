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

const formatCommas = (number) => { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(number); };


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


// GET Sign In Page
router.get('/login', (req, res) => {
    res.render('pages/login', { isLoginPage: true, isSignupPage: false, isHomepage: false, user: req.session.user });
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
        let totalSpent = 0;
        let tripsProcessed = 0;

        // If there are no trips at all, render the dashboard immediately
        if (trips.length === 0) {
            return res.render('pages/dashboard', {
                trips: [],
                ongoing_trips: [],
                upcoming_trips: [],
                completed_trips: [],
                completed_trips_all: [],
                ongoing_trips_limited: [],
                upcoming_trips_limited: [],
                completed_trips_limited: [],
                next_trip: null,
                reminders: [],
                trip_count: 0,
                total_budget: formatCommas(0),
                total_spent: formatCommas(0),
                user: req.session.user
            });
        }

        // Prepare trips data
        trips.forEach(trip => {
            trip.budget = formatCommas(trip.budget);
            const startDate = new Date(trip.start_date);
            const endDate = new Date(trip.end_date);

            trip.start_date = formatDate(trip.start_date);
            trip.end_date = formatDate(trip.end_date);
            trip.is_completed = trip.completed === 1 || endDate < today;
            trip.duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            trip.destination_name = trip.destination_name || trip.destination;

            if (trip.is_completed) {
                trip.old_duration = oldDuration(trip.end_date);
            }
        });

        // Categorize trips
        let ongoingTrips = trips.filter(trip => !trip.is_completed && new Date(trip.start_date) <= today && new Date(trip.end_date) >= today);
        let upcomingTrips = trips.filter(trip => !trip.is_completed && new Date(trip.start_date) > today);
        let completedTrips = trips.filter(trip => trip.is_completed);

        // Ensure completed trips are sorted by most recent first
        completedTrips.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

        completedTrips.forEach((trip, index) => {
            trip.last = index === completedTrips.length - 1;
        });

        const ongoingTripsLimited = ongoingTrips.slice(0, 3);
        const upcomingTripsLimited = upcomingTrips.slice(0, 3);
        const completedTripsLimited = completedTrips.slice(0, 3);

        const reminders = trips
            .filter(trip => trip.reminder && trip.reminder.trim() !== "" && !trip.is_completed)
            .map((trip, index, array) => ({ 
                destination_name: trip.destination_name || trip.destination, 
                start_date: trip.start_date,
                last: index === array.length - 1
            }));

        // Fetch expenses for all trips
        trips.forEach(trip => {
            tripModel.getExpensesByTripId(trip.id, (expenses) => {
                trip.total_spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
                totalSpent += trip.total_spent;
                tripsProcessed++;

                // Ensure all trips are processed before rendering
                if (tripsProcessed === trips.length) {
                    res.render('pages/dashboard', {
                        trips,
                        ongoing_trips: ongoingTrips,
                        upcoming_trips: upcomingTrips,
                        completed_trips: completedTripsLimited.length > 0 ? completedTripsLimited : null,
                        completed_trips_all: completedTrips.length > 0 ? completedTrips : null,
                        ongoing_trips_limited: ongoingTripsLimited, 
                        upcoming_trips_limited: upcomingTripsLimited,
                        next_trip: upcomingTrips.length > 0 ? upcomingTrips[0] : null,
                        reminders,
                        trip_count: trips.length,
                        total_budget: formatCommas(trips.reduce((sum, trip) => sum + parseFloat(trip.budget.toString().replace(/[^0-9.]/g, '')) || 0, 0)),
                        total_spent: formatCommas(totalSpent),
                        user: req.session.user
                    });
                }
            });
        });
    });
});



const oldDuration = (dateString) => {
    const endDate = new Date(dateString);
    const today = new Date();
    const timeDiff = today - endDate;
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
};


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

    const user_id = req.session.user.id;

    let { destination, destination_name, start_date, end_date, budget, notes, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details } = req.body;


    if (!destination_name || !destination || destination.length < 3 || budget <= 0) {
        return res.status(400).send("Invalid input: Destination must be at least 3 characters, and budget must be positive.");
    }

    if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).send("Error: End date cannot be before start date.");
    }

    tripModel.addTrip({ destination, destination_name, start_date, end_date, budget, notes, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details }, user_id, () => {
        res.redirect('/mytrips');
    });
});




router.get('/itinerary/:id', requireLogin, (req, res) => {
    const tripId = parseInt(req.params.id, 10);

    tripModel.getTripById(tripId, (trip) => {
        if (!trip) {
            return res.status(404).send("Trip not found");
        }

        tripModel.getExpensesByTripId(tripId, (expenses) => {
            // Map expenses to include both numeric amount and formattedAmount
            trip.expenses = expenses.map(expense => ({
                ...expense,
                formattedAmount: `$${expense.amount.toFixed(2)}`
            })) || [];

            // Calculate total spent using the numeric amount
            trip.total_spent = expenses.reduce((sum, expense) => sum + expense.amount, 0) || 0;
            trip.remaining_budget = trip.budget - trip.total_spent;

            // Rest of the code remains unchanged
            tripModel.getScheduleByTripId(tripId, (schedule) => {
                trip.schedule = schedule.map(item => ({
                    ...item,
                    formatted_date: formatDate(item.date)
                })) || [];

                tripModel.getBookingsByTripId(tripId, (bookings) => {
                    trip.bookings = bookings || [];

                    const itineraryData = {
                        id: trip.id,
                        trip_id: trip.id,
                        destination: trip.destination,
                        destination_name: trip.destination_name || trip.destination,
                        start_date: formatDate(trip.start_date),
                        end_date: formatDate(trip.end_date),
                        duration: Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24)),
                        budget: formatCommas(trip.budget),
                        category: trip.category || "Uncategorized",
                        priority: trip.priority,
                        notes: trip.notes || "",
                        reminder: trip.reminder || "No reminder set",
                        total_spent: formatCommas(trip.total_spent),
                        remaining_budget: formatCommas(trip.remaining_budget),
                        transportation: trip.transportation || "Not specified",
                        transportation_details: trip.transportation_details || "Not specified",
                        accommodation: trip.accommodation || "Not specified",
                        accommodation_details: trip.accommodation_details || "Not specified",
                        schedule: trip.schedule,
                        bookings: trip.bookings,
                        expenses: trip.expenses,
                        user: req.session.user
                    };

                    res.render('pages/itinerary', itineraryData);
                });
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


// Add Booking
router.post('/itinerary/:id/add-booking', requireLogin, (req, res) => {

    const tripId = req.params.id;
    
    const { type, details, departure_time, arrival_time, hotel_name, check_in_date, check_out_date, pickup_location, dropoff_location, pickup_date, dropoff_date, departure_airport, arrival_airport, departure_port, arrival_port, cruise_line, departure_station, arrival_station, train_number, departure_terminal, arrival_terminal, bus_number } = req.body;

    tripModel.addBooking(tripId, { type, details, departure_time, arrival_time, hotel_name, check_in_date, check_out_date, pickup_location, dropoff_location, pickup_date, dropoff_date, departure_airport, arrival_airport, departure_port, arrival_port, cruise_line, departure_station, arrival_station, train_number, departure_terminal, arrival_terminal, bus_number }, (success, bookingId) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to add booking." });
        }
        res.json({ success: true, id: bookingId, type, details });
    });
});



// Edit Booking
router.post('/itinerary/:id/edit-booking/:bookingId', requireLogin, (req, res) => {
    const { bookingId } = req.params;
    const { type, details, departure_time, arrival_time, hotel_name, check_in_date, check_out_date, pickup_location, dropoff_location, pickup_date, dropoff_date, departure_airport, arrival_airport, departure_port, arrival_port, cruise_line, departure_station, arrival_station, train_number, departure_terminal, arrival_terminal, bus_number } = req.body;

    tripModel.updateBooking(bookingId, { type, details, departure_time, arrival_time, hotel_name, check_in_date, check_out_date, pickup_location, dropoff_location, pickup_date, dropoff_date, departure_airport, arrival_airport, departure_port, arrival_port, cruise_line, departure_station, arrival_station, train_number, departure_terminal, arrival_terminal, bus_number }, (success) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to update booking." });
        }
        res.json({ success: true, type, details });
    });
});


// Delete Booking
router.post('/itinerary/:id/delete-booking/:bookingId', requireLogin, (req, res) => {
    const { bookingId } = req.params;

    tripModel.deleteBooking(bookingId, (success) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to delete booking." });
        }
        res.json({ success: true });
    });
});



// POST Add Expense to a Trip
router.post('/itinerary/:id/add-expense', requireLogin, (req, res) => {

    const tripId = parseInt(req.params.id, 10);
    const { name, amount } = req.body;

    if (!name || amount <= 0) {
        return res.status(400).json({ error: "Invalid expense data." });
    }

    tripModel.addExpense(tripId, { name, amount }, (success, expenseId) => {
        if (!success) {
            return res.status(500).json({ error: "Failed to add expense." });
        }
        res.json({ success: true, id: expenseId, name, amount });
    });
});


// POST Delete Expense
router.post('/itinerary/:id/edit-expense/:expenseId', requireLogin, (req, res) => {
    const { expenseId } = req.params;
    const { name, amount } = req.body;

    tripModel.updateExpense(expenseId, { name, amount }, (success) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to update expense." });
        }
        res.json({ success: true, name, amount });
    });
});


router.post('/itinerary/:id/delete-expense/:expenseId', requireLogin, (req, res) => {
    const { expenseId } = req.params;

    tripModel.deleteExpense(expenseId, (success) => {
        if (!success) {
            return res.status(500).json({ success: false, message: "Failed to delete expense." });
        }
        res.json({ success: true });
    });
});



// GET Edit Trip Page
router.get('/edit/:id', requireLogin, (req, res) => {
    
    const id = req.params.id;

    const success = req.query.success === "true";
    const error = req.query.error === "true";
    const from = req.query.from || req.body.from || ""; 
    const from_itinerary = req.query.from === "itinerary";
    const from_mytrips = req.query.from === "mytrips";

    tripModel.getTripById(id, (trip) => {
        if (!trip) {
            return res.status(404).send("Trip not found");
        }
        res.render('templates/editTrip', { 
            trip, 
            success, 
            error, 
            from_itinerary, 
            from_mytrips, 
            from, 
            isFlight: trip.transportation === "Flight",
            isCruise: trip.transportation === "Cruise",
            isTrain: trip.transportation === "Train",
            isCar: trip.transportation === "Car",
            isBus: trip.transportation === "Bus",
            isOtherTransport: !["Flight", "Cruise", "Train", "Car", "Bus"].includes(trip.transportation),

            isHotel: trip.accommodation === "Hotel",
            isHostel: trip.accommodation === "Hostel",
            isAirbnb: trip.accommodation === "Airbnb",
            isCamping: trip.accommodation === "Camping",
            isOtherAccommodation: !["Hotel", "Hostel", "Airbnb", "Camping"].includes(trip.accommodation),

            user: req.session.user
         });
    });
});


router.post('/edit/:id', requireLogin, (req, res) => {

    const id = req.params.id;
    
    const { destination_name, destination, start_date, end_date, budget, notes, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details } = req.body;
    
    const from = req.query.from || req.body.from || ""; 

    tripModel.updateTrip(id, { destination_name, destination, start_date, end_date, budget, notes, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details }, (err) => {
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
            return res.status(404).json({ success: false, message: "Trip not found" });
        }

        const today = new Date();
        const endDate = new Date(trip.end_date);

        if (today < endDate) {
            return res.status(400).json({ success: false, message: "Error: You cannot mark a trip as completed before it ends." });
        }

        tripModel.markTripCompleted(id, () => {
            res.json({ success: true });
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
        { destination: 'Paris', best_time: 'Spring', budget: '$2,000', category: "Europe", image: "/images/paris.jpg" },
        { destination: 'Tokyo', best_time: 'Autumn', budget: '$2,500', category: "Asia", image: "/images/tokyo.jpg" },
        { destination: 'Rome', best_time: 'Summer', budget: '$1,800', category: "Europe", image: "/images/rome.jpg" },
        { destination: 'New York', best_time: 'Winter', budget: '$2,200', category: "USA", image: "/images/newyork.jpg" },
        { destination: 'Miami', best_time: 'Winter', budget: '$2,000', category: "USA", image: "/images/miami.jpg" },
        { destination: 'Sydney', best_time: 'Spring', budget: '$2,700', category: "Australia", image: "/images/sydney.jpg" }
    ];    

    const tips = [
        { title: "Pack Smart", category: "Packing", content: "Roll your clothes to save space and avoid wrinkles." },
        { title: "Save on Flights", category: "Budget Travel", content: "Book flights on weekdays for the best deals." },
        { title: "Stay Safe While Traveling", category: "Safety", content: "Avoid showing valuables in crowded places." },
        { title: "Learn Basic Local Phrases", category: "Local Tips", content: "Knowing a few phrases can help in emergencies." }
    ];

    res.render('pages/explore', { suggested_trips: suggestedTrips, tips, user: req.session.user });
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
