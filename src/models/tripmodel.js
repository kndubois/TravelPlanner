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
    db.all("SELECT * FROM trips", [], (err, rows) => {
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



module.exports = { init, createUser, findUserByEmail, getAllTrips, addTrip, getTripById, updateTrip, deleteTrip, markTripCompleted, getFilteredTrips };
