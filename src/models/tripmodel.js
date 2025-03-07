const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./config/database.db');

const init = () => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        default_currency TEXT DEFAULT 'CAD',
        timezone TEXT DEFAULT 'UTC-5',
        theme TEXT DEFAULT 'light',
        language TEXT DEFAULT 'en'
    )`);

    // Trips Table
    db.run(`CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        destination TEXT NOT NULL,
        destination_name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        budget REAL NOT NULL,
        notes TEXT,
        completed INTEGER DEFAULT 0,
        reminder TEXT,
        priority TEXT NOT NULL, 
        category TEXT NOT NULL,
        transportation TEXT,
        accommodation TEXT,
        transportation_details TEXT,
        accommodation_details TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Schedule Table
    db.run(`CREATE TABLE IF NOT EXISTS schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        activities TEXT NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    )`);

    // Bookings Table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        details TEXT NOT NULL,
        departure_airport TEXT DEFAULT NULL,
        departure_time TEXT DEFAULT NULL,
        arrival_airport TEXT DEFAULT NULL,
        arrival_time TEXT DEFAULT NULL,
        departure_port TEXT DEFAULT NULL,
        arrival_port TEXT DEFAULT NULL,
        cruise_line TEXT DEFAULT NULL,
        departure_station TEXT DEFAULT NULL,
        arrival_station TEXT DEFAULT NULL,
        train_number TEXT DEFAULT NULL,
        departure_terminal TEXT DEFAULT NULL,
        arrival_terminal TEXT DEFAULT NULL,
        bus_number TEXT DEFAULT NULL,
        hotel_name TEXT DEFAULT NULL, 
        check_in_date TEXT DEFAULT NULL,
        check_out_date TEXT DEFAULT NULL,
        pickup_location TEXT DEFAULT NULL,
        dropoff_location TEXT DEFAULT NULL,
        pickup_date TEXT DEFAULT NULL,
        dropoff_date TEXT DEFAULT NULL,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    )`);
};



const createUser = (user, callback) => {
    const { name, username, email, password } = user;
    db.run(
        "INSERT INTO users (name, username, email, password) VALUES (?, ?, ?, ?)",
        [name, username, email, password],
        function (err) {
            if (err) {
                console.error("Error inserting user:", err);
                return callback(err);
            }
            callback(null);
        }
    );
};

const getUserById = (id, callback) => {
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("Error fetching user:", err);
            return callback(null);
        }
        callback(row);
    });
};


const updateUser = (id, user, callback) => {
    const { name, username, email, hashedPassword, default_currency, timezone, theme, language } = user;

    let query = `
        UPDATE users 
        SET name = ?, username = ?, email = ?, default_currency = ?, timezone = ?, theme = ?, language = ?
    `;

    let params = [name, username, email, default_currency, timezone, theme, language];

    if (hashedPassword) {
        query += ", password = ?";
        params.push(hashedPassword);
    }

    query += " WHERE id = ?;";
    params.push(id);

    db.run(query, params, function (err) {
        if (err) {
            console.error("Error updating user:", err);
            return callback(err);
        }
        callback(null);
    });
};


const findUserByEmail = (email, callback) => {
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            console.error(err);
            return callback(null);
        }
        callback(row);
    });
};


const getAllTrips = (callback) => {
    db.all("SELECT * FROM trips ORDER BY start_date ASC", [], (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        callback(rows);
    });
};

const addTrip = (trip, user_id, callback) => { 
    const { destination, destination_name, start_date, end_date, budget, notes, completed, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details } = trip;
    
    db.run(
        "INSERT INTO trips (user_id, destination, destination_name, start_date, end_date, budget, notes, completed, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [user_id, destination, destination_name, start_date, end_date, budget, notes, completed, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details],
        function (err) {
            if (err) {
                console.error("Error inserting trip:", err);
                return;
            }
            callback(this.lastID);
        }
    );
};

// Update an existing trip
const updateTrip = (id, trip, callback) => {
    const { destination_name, destination, start_date, end_date, budget, notes, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details } = trip;
    
    const sql = `
        UPDATE trips 
        SET destination_name = ?, destination = ?, start_date = ?, end_date = ?, budget = ?, notes = ?, reminder = ?, priority = ?, category = ?, transportation = ?, accommodation = ?, transportation_details = ?, accommodation_details = ?
        WHERE id = ?;
    `;

    db.run(sql, [destination_name, destination, start_date, end_date, budget, notes, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details, id], function (err) {
        if (err) {
            return callback(err);
        }
        callback();
    });
};


const deleteTrip = (id, callback) => {
    db.run("DELETE FROM trips WHERE id = ?", [id], function (err) {
        if (err) {
            console.error(err);
            return;
        }
        callback();
    });
};

const markTripCompleted = (id, callback) => {
    db.run("UPDATE trips SET completed = 1 WHERE id = ?", [id], function (err) {
        if (err) {
            console.error(err);
            return;
        }
        callback();
    });
};


// Get a single trip by ID
const getTripById = (id, callback) => {
    db.get("SELECT * FROM trips WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error(err);
            return callback(null);
        }
        callback(row);
    });
};

const getFilteredTrips = (filters, callback) => {
    let query = "SELECT id, user_id, destination, destination_name, start_date, end_date, budget, notes, completed, reminder, priority, category, transportation, accommodation, transportation_details, accommodation_details FROM trips WHERE 1=1";
    let params = [];

    if (filters.priority && filters.priority !== "") {
        query += " AND priority = ?";
        params.push(filters.priority);
    }
    if (filters.category && filters.category.trim() !== "") {
        query += " AND category LIKE ?";
        params.push(`%${filters.category}%`);
    }
    if (filters.budget && filters.budget !== "") {
        query += " AND budget <= ?";
        params.push(filters.budget);
    }
    if (filters.start_date && filters.start_date !== "") {
        query += " AND start_date >= ?";
        params.push(filters.start_date);
    }
    if (filters.end_date && filters.end_date !== "") {
        query += " AND end_date <= ?";
        params.push(filters.end_date);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Error fetching trips:", err);
            return callback([]);
        }
        const today = new Date();

        rows.forEach(trip => {
            const startDate = new Date(trip.start_date);
            const endDate = new Date(trip.end_date);

            trip.is_completed = trip.completed === 1 || endDate < today;
            trip.is_ongoing = !trip.is_completed && startDate <= today && endDate >= today;
            trip.is_upcoming = !trip.is_completed && startDate > today;
        });

        if (filters.status) {
            rows = rows.filter(trip => {
                if (filters.status === "ongoing") return trip.is_ongoing;
                if (filters.status === "upcoming") return trip.is_upcoming;
                if (filters.status === "completed") return trip.is_completed;
                return true;
            });
        }

        callback(rows);
    });
};

const addScheduleItem = (tripId, schedule, callback) => {

    const { date, activities } = schedule;
    
    db.run(
        "INSERT INTO schedule (trip_id, date, activities) VALUES (?, ?, ?)",
        [tripId, date, activities],
        function (err) {
            if (err) {
                return callback(false);
            }
            callback(true); 
        }
    );
};


const updateSchedule = (id, schedule, callback) => {
    const { date, activities } = schedule;
    db.run("UPDATE schedule SET date = ?, activities = ? WHERE id = ?",
        [date, activities, id],
        function (err) {
            if (err) {
                console.error("Error updating schedule:", err);
                return callback(false);
            }
            callback(true);
        }
    );
};

const deleteSchedule = (id, callback) => {
    db.run("DELETE FROM schedule WHERE id = ?", [id], function (err) {
        if (err) {
            console.error("Error deleting schedule:", err);
            return callback(false);
        }
        callback(true);
    });
};

const getScheduleByTripId = (tripId, callback) => {
    
    db.all("SELECT * FROM schedule WHERE trip_id = ?", [tripId], (err, rows) => {
        if (err) {
            console.error("Error fetching schedule:", err);
            return callback([]);
        }
        callback(rows);
    });
};


const addBooking = (tripId, booking, callback) => {
    const { type, details, departure_time, departure_airport, arrival_time, arrival_airport, hotel_name, check_in_date, check_out_date, pickup_location, dropoff_location, pickup_date, dropoff_date, departure_port, arrival_port, cruise_line, departure_station, arrival_station, train_number, departure_terminal, arrival_terminal, bus_number } = booking;
    db.run("INSERT INTO bookings (trip_id, type, details, departure_time, departure_airport, arrival_time, arrival_airport, hotel_name, check_in_date, check_out_date, pickup_location, dropoff_location, pickup_date, dropoff_date, departure_port, arrival_port, cruise_line, departure_station, arrival_station, train_number, departure_terminal, arrival_terminal, bus_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [tripId, type, details, departure_time, departure_airport, arrival_time, arrival_airport, hotel_name, check_in_date, check_out_date, pickup_location, dropoff_location, pickup_date, dropoff_date, departure_port, arrival_port, cruise_line, departure_station, arrival_station, train_number, departure_terminal, arrival_terminal, bus_number],
        function (err) {
            if (err) {
                console.error("Error adding booking:", err);
                return callback(false);
            }
            callback(true, this.lastID);
        }
    );
};

const updateBooking = (id, booking, callback) => {
    const { type, details, departure_time, departure_airport, arrival_time, arrival_airport, hotel_name, check_in_date, check_out_date, pickup_location, dropoff_location, pickup_date, dropoff_date, departure_port, arrival_port, cruise_line, departure_station, arrival_station, train_number, departure_terminal, arrival_terminal, bus_number } = booking;
    db.run("UPDATE bookings SET type = ?, details = ?, departure_time = ?, arrival_time = ?, hotel_name = ?, check_in_date = ?, check_out_date = ?, pickup_location = ?, dropoff_location = ?, pickup_date = ?, dropoff_date = ?, departure_airport = ?, arrival_airport = ?, departure_port = ?, arrival_port = ?, cruise_line = ?, departure_station = ?, arrival_station = ?, train_number = ?, departure_terminal = ?, arrival_terminal = ?, bus_number = ? WHERE id = ?",
        [type, details, departure_time, departure_airport, arrival_time, arrival_airport, hotel_name, check_in_date, check_out_date, pickup_location, dropoff_location, pickup_date, dropoff_date, departure_port, arrival_port, cruise_line, departure_station, arrival_station, train_number, departure_terminal, arrival_terminal, bus_number, id],
        function (err) {
            if (err) {
                console.error("Error updating booking:", err);
                return callback(false);
            }
            callback(true);
        }
    );
};


const deleteBooking = (id, callback) => {
    db.run("DELETE FROM bookings WHERE id = ?", [id], function (err) {
        if (err) {
            console.error("Error deleting booking:", err);
            return callback(false);
        }
        callback(true);
    });
};

const getBookingsByTripId = (tripId, callback) => {
    db.all("SELECT * FROM bookings WHERE trip_id = ?", [tripId], (err, rows) => {
        if (err) {
            console.error("Error fetching bookings:", err);
            return callback([]);
        }
        callback(rows);
    });
};



// Add an expense to a trip
const addExpense = (tripId, expense, callback) => {
    const { name, amount } = expense;
    db.run("INSERT INTO expenses (trip_id, name, amount) VALUES (?, ?, ?)",
        [tripId, name, amount],
        function (err) {
            if (err) {
                console.error("Error adding expense:", err);
                return callback(false, null);
            }
            callback(true, this.lastID);
        }
    );
};

const updateExpense = (id, expense, callback) => {
    const { name, amount } = expense;
    db.run("UPDATE expenses SET name = ?, amount = ? WHERE id = ?",
        [name, amount, id],
        function (err) {
            if (err) {
                console.error("Error updating expense:", err);
                return callback(false);
            }
            callback(true);
        }
    );
};

// Delete an expense
const deleteExpense = (expenseId, callback) => {
    db.run("DELETE FROM expenses WHERE id = ?", [expenseId], function (err) {
        if (err) {
            return callback(false);
        }
        callback(true);
    });
};

// Get all expenses for a specific trip
const getExpensesByTripId = (tripId, callback) => {

    db.all("SELECT * FROM expenses WHERE trip_id = ?", [tripId], (err, expenses) => {
        if (err) {
            console.error("Error fetching expenses from database:", err); // delete later 
            return callback([]);
        }
        callback(expenses);
    });
};



// Get itinerary details for a specific trip
const getItineraryByTripId = (tripId, callback) => {
    db.get("SELECT * FROM trips WHERE id = ?", [tripId], (err, row) => {
        if (err) {
            console.error(err);
            return callback(null);
        }
        callback(row);
    });
};




module.exports = { init, createUser, updateUser, getUserById, findUserByEmail, getAllTrips, addTrip, getTripById, updateTrip, deleteTrip, markTripCompleted, addScheduleItem, updateSchedule, deleteSchedule, addBooking, updateBooking, deleteBooking, addExpense, updateExpense, deleteExpense, getExpensesByTripId, getItineraryByTripId, getScheduleByTripId, getBookingsByTripId, getFilteredTrips };
