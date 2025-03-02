const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./config/database.db');

const init = () => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // Trips Table
    db.run(`CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        destination TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        budget REAL NOT NULL,
        notes TEXT,
        completed INTEGER DEFAULT 0,
        reminder TEXT,
        priority TEXT NOT NULL, 
        category TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#007BFF',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        activities TEXT NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        details TEXT NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        item TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
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

const addTrip = (trip, user_id, callback) => {  // Now includes user_id
    const { destination, start_date, end_date, budget, notes, reminder, priority, category, color } = trip;
    
    db.run(
        "INSERT INTO trips (user_id, destination, start_date, end_date, budget, notes, reminder, priority, category, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [user_id, destination, start_date, end_date, budget, notes, reminder, priority, category, color],
        function (err) {
            if (err) {
                console.error("Error inserting trip:", err);
                return;
            }
            callback(this.lastID);
        }
    );
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

// Update an existing trip
const updateTrip = (id, trip, callback) => {
    const { destination, start_date, end_date, budget, notes, reminder, priority, category, color } = trip;
    db.run(
        "UPDATE trips SET destination = ?, start_date = ?, end_date = ?, budget = ?, notes = ?, reminder = ?, priority = ?, category = ?, color = ? WHERE id = ?",
        [destination, start_date, end_date, budget, notes, reminder, priority, category, color, id],
        function (err) {
            if (err) {
                console.error(err);
                return;
            }
            callback();
        }
    );
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


const getFilteredTrips = (filters, callback) => {
    let query = "SELECT id, user_id, destination, start_date, end_date, budget, notes, reminder, priority, category, color, completed FROM trips WHERE 1=1";
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
                console.error("🔥 Database insert error:", err.message);
                return callback(false);
            }
            console.log("✅ Schedule added successfully with ID:", this.lastID);
            callback(true);  // Make sure we return `true` instead of false
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

const addBooking = (tripId, booking, callback) => {
    const { type, details } = booking;
    db.run("INSERT INTO bookings (trip_id, type, details) VALUES (?, ?, ?)",
        [tripId, type, details],
        function (err) {
            if (err) {
                console.error("Error adding booking:", err);
                return callback(false);
            }
            callback(true, this.lastID); // Return the new booking ID
        }
    );
};

const updateBooking = (id, booking, callback) => {
    const { type, details } = booking;
    db.run("UPDATE bookings SET type = ?, details = ? WHERE id = ?",
        [type, details, id],
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


const addTask = (tripId, task, callback) => {
    const { item } = task;
    db.run("INSERT INTO tasks (trip_id, item) VALUES (?, ?)",
        [tripId, item],
        function (err) {
            if (err) {
                console.error("Error adding task:", err);
                return;
            }
            callback();
        }
    );
};

const updateTask = (id, task, callback) => {
    const { item } = task;
    db.run("UPDATE tasks SET item = ? WHERE id = ?",
        [item, id],
        function (err) {
            if (err) {
                console.error("Error updating task:", err);
                return;
            }
            callback();
        }
    );
};

const deleteTask = (id, callback) => {
    db.run("DELETE FROM tasks WHERE id = ?", [id], function (err) {
        if (err) {
            console.error("Error deleting task:", err);
            return;
        }
        callback();
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

const getScheduleByTripId = (tripId, callback) => {
    db.all("SELECT * FROM schedule WHERE trip_id = ?", [tripId], (err, rows) => {
        if (err) {
            console.error("Error fetching schedule:", err);
            return callback([]);
        }
        callback(rows);
    });
};

const getBookingsByTripId = (tripId, callback) => {
    db.all("SELECT * FROM bookings WHERE trip_id = ?", [tripId], (err, rows) => {
        if (err) {
            console.error("Error fetching bookings:", err);
            return callback([]);
        }
        console.log("✅ Retrieved Bookings from DB:", rows); // ✅ LOG BOOKINGS
        callback(rows);
    });
};

module.exports = { init, createUser, findUserByEmail, getAllTrips, addTrip, getTripById, updateTrip, deleteTrip, markTripCompleted, addScheduleItem, updateSchedule, deleteSchedule, addBooking, updateBooking, deleteBooking, addTask, updateTask, deleteTask, getItineraryByTripId, getScheduleByTripId, getBookingsByTripId, getFilteredTrips };
