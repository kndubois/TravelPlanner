function startCountdown(targetDate, elementId) {
    const countdownElement = document.getElementById(elementId);

    targetDate = targetDate.replace(/&#x2F;/g, "/");

    const tripDate = new Date(targetDate);

    if (isNaN(tripDate.getTime())) {
        countdownElement.innerHTML = "Invalid Date";
        return;
    }

    function updateCountdown() {
        const now = new Date();
        const difference = tripDate - now;

        if (difference <= 0) {
            countdownElement.innerHTML = "Ongoing";
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        countdownElement.innerHTML = `<span>${days} days • ${hours} hours • ${minutes} minutes</span>`;
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();
}


function generateScheduleDays(startDate, endDate) {
    const scheduleContainer = document.getElementById("schedule-list");
    scheduleContainer.innerHTML = "";

    let currentDate = new Date(startDate);
    let tripEndDate = new Date(endDate);
    let index = 1;

    while (currentDate <= tripEndDate) {
        let formattedDate = currentDate.toISOString().split('T')[0];

        scheduleContainer.innerHTML += `
            <div class="border-bottom py-2 d-flex justify-content-between">
                <div>
                    <p class="fw-semibold mb-1">Day ${index} - ${formattedDate}</p>
                    <p class="text-muted small"></p>
                </div>
                <button class="btn btn-sm btn-outline-secondary">Edit</button>
            </div>
        `;
        currentDate.setDate(currentDate.getDate() + 1);
        index++;
    }
}

function toggleAddSchedule() {
    let form = document.getElementById("add-schedule-form");
    if (form) form.classList.toggle("d-none");
}


function submitNewSchedule(event, tripId) {
    event.preventDefault();

    // If tripId is not passed, get it from the hidden input
    if (!tripId || tripId === "undefined") {
        tripId = document.getElementById("trip-id").value;
    }

    if (!tripId) {
        console.error("Trip ID is missing in function call.");
        alert("Error: Trip ID is missing.");
        return;
    }

    let date = document.getElementById("new-schedule-date").value;
    let activities = document.getElementById("new-schedule-activities").value;

    console.log("Submitting Schedule:", { tripId, date, activities });

    fetch(`/itinerary/${tripId}/add-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, activities })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("✅ Schedule added successfully. Refreshing list...");

            // Refresh schedule list from server
            fetch(`/itinerary/${tripId}`)
                .then(response => response.text())
                .then(html => {
                    let parser = new DOMParser();
                    let doc = parser.parseFromString(html, "text/html");
                    let updatedSchedule = doc.querySelector("#schedule-list").innerHTML;

                    if (updatedSchedule) {
                        document.getElementById("schedule-list").innerHTML = updatedSchedule;
                        console.log("🔄 Schedule list updated successfully.");
                    } else {
                        console.warn("⚠️ Warning: Could not find updated schedule list.");
                    }
                });

            document.getElementById("add-schedule-form").classList.add("d-none");
        } else {
            alert("Failed to add schedule: " + data.message);
        }
    })
    .catch(err => {
        console.error("Fetch error:", err);
        alert("Failed to add schedule.");
    });
}


function toggleEditSchedule(scheduleId) {
    let form = document.getElementById(`edit-schedule-form-${scheduleId}`);
    if (form) {
        form.classList.toggle("d-none");
    } else {
        console.error(`⚠️ Edit form not found for Schedule ID ${scheduleId}`);
    }
}



// Update an existing schedule item
function updateSchedule(event, scheduleId, tripId) {
    event.preventDefault();

    let date = document.getElementById(`edit-schedule-date-${scheduleId}`).value;
    let activities = document.getElementById(`edit-schedule-activities-${scheduleId}`).value;

    fetch(`/itinerary/${tripId}/edit-schedule/${scheduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, activities })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`✅ Schedule ID ${scheduleId} updated successfully`);

            // Update UI without a page refresh
            let scheduleElement = document.getElementById(`schedule-${scheduleId}`);
            if (scheduleElement) {
                scheduleElement.innerHTML = `
                    <div>
                        <p class="fw-semibold text-primary mb-1">${date}</p>
                        <p class="text-muted small">${activities}</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="toggleEditSchedule('${scheduleId}')">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteSchedule('${scheduleId}', '${tripId}')">Delete</button>
                    </div>
                `;
            } 
            toggleEditSchedule(scheduleId); // Hide the edit form
        } else {
            alert("Failed to update schedule.");
        }
    })
    .catch(err => console.error("❌ Error:", err));
}



// Delete a schedule item
function deleteSchedule(scheduleId, tripId) {
    if (!confirm("Are you sure you want to delete this schedule item?")) return;

    fetch(`/itinerary/${tripId}/delete-schedule/${scheduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`✅ Schedule ID ${scheduleId} deleted successfully`);

            // Remove the deleted schedule from the UI immediately
            let scheduleElement = document.getElementById(`schedule-${scheduleId}`);
            if (scheduleElement) {
                scheduleElement.remove();
            } else {
                console.warn("⚠️ Schedule element not found in DOM.");
            }
        } else {
            alert("Failed to delete schedule.");
        }
    })
    .catch(err => console.error("❌ Error:", err));
}




function toggleAddBooking() {
    let form = document.getElementById("add-booking-form");
    if (form) form.classList.toggle("d-none");
}

// Toggle edit form visibility for bookings
function toggleEditBooking(bookingId) {
    const form = document.getElementById(`edit-booking-form-${bookingId}`);
    form.classList.toggle("d-none");
}


function submitNewBooking(event) {
    event.preventDefault();

    let tripId = document.getElementById("trip-id").value;
    let type = document.getElementById("new-booking-type").value;
    let details = document.getElementById("new-booking-details").value;

    if (!tripId) {
        console.error("Trip ID is missing.");
        alert("Error: Trip ID is missing.");
        return;
    }

    fetch(`/itinerary/${tripId}/add-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let list = document.getElementById("booking-list");
            let newBooking = document.createElement("div");
            newBooking.id = `booking-${data.id}`;
            newBooking.classList.add("border", "rounded-3", "p-3", "mb-2", "shadow-sm", "d-flex", "justify-content-between", "align-items-center");

            newBooking.innerHTML = `
                <div>
                    <p class="fw-semibold text-primary mb-1">${data.type}</p>
                    <p class="text-muted small">${data.details}</p>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="toggleEditBooking('${data.id}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteBooking('${data.id}', '${tripId}')">Delete</button>
                </div>
            `;

            list.appendChild(newBooking); // Add new booking to the list
            toggleAddBooking(); // Hide form after adding
            document.getElementById("new-booking-type").value = ""; // Reset form
            document.getElementById("new-booking-details").value = ""; // Reset form
        } else {
            alert("Failed to add booking.");
        }
    })
    .catch(err => {
        console.error("Fetch error:", err);
        alert("Failed to add booking.");
    });
}


// Update an existing booking item
function updateBooking(event, bookingId) {
    event.preventDefault();

    let tripId = document.getElementById("trip-id").value; // Ensure trip ID is retrieved
    let type = document.getElementById(`edit-booking-type-${bookingId}`).value;
    let details = document.getElementById(`edit-booking-details-${bookingId}`).value;

    fetch(`/itinerary/${tripId}/edit-booking/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let bookingElement = document.getElementById(`booking-${bookingId}`);
            if (bookingElement) {
                bookingElement.innerHTML = `
                    <div>
                        <p class="fw-semibold text-primary mb-1">${type}</p>
                        <p class="text-muted small">${details}</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="toggleEditBooking('${bookingId}')">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteBooking('${bookingId}', '${tripId}')">Delete</button>
                    </div>
                `;
            }
            toggleEditBooking(bookingId); // Hide edit form after saving
        } else {
            alert("Failed to update booking.");
        }
    })
    .catch(err => console.error("Error updating booking:", err));
}


// Delete a booking item
function deleteBooking(bookingId, tripId) {
    if (!confirm("Are you sure you want to delete this booking?")) return;

    fetch(`/itinerary/${tripId}/delete-booking/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById(`booking-${bookingId}`).remove(); // Remove item from UI
        } else {
            alert("Failed to delete booking.");
        }
    })
    .catch(err => console.error("Error:", err));
}



function toggleAddTask() {
    document.getElementById("add-task-form").classList.toggle("d-none");
}

function submitNewTask(event, tripId) {
    event.preventDefault();
    let item = document.getElementById("new-task-item").value;

    fetch(`/itinerary/${tripId}/add-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById("task-list").innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${data.item}
                </li>
            `;
            document.getElementById("add-task-form").classList.add("d-none");
            document.getElementById("new-task-item").value = "";
        }
    })
    .catch(err => console.error("Error:", err));
}



function submitExpense(event, tripId) {
    event.preventDefault();

    // Check if tripId is correctly passed
    console.log("🛠 Submitting Expense - Trip ID:", tripId);

    const name = document.getElementById("expense-name").value;
    const amount = parseFloat(document.getElementById("expense-amount").value);

    console.log("🔄 Sending Expense Data:", { tripId, name, amount });

    fetch(`/itinerary/${tripId}/add-expense`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, amount })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Expense added:", data); // delete later
            location.reload(); // Refresh to see new expense
        } else {
            console.error("Error adding expense:", data.error); // delete later
        }
    })
    .catch(error => console.error("Fetch Error:", error)); // delete later
}

function toggleEditExpense(expenseId) {
    let form = document.getElementById(`edit-expense-form-${expenseId}`);
    if (form) {
        form.classList.toggle("d-none");
    } else {
        console.error(`⚠️ Edit form not found for Expense ID ${expenseId}`);
    }
}


function updateExpense(event, expenseId, tripId) {
    event.preventDefault();

    let name = document.getElementById(`edit-expense-name-${expenseId}`).value;
    let amount = parseFloat(document.getElementById(`edit-expense-amount-${expenseId}`).value);

    fetch(`/itinerary/${tripId}/edit-expense/${expenseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let expenseElement = document.getElementById(`expense-${expenseId}`);
            if (expenseElement) {
                expenseElement.innerHTML = `
                    <div>
                        <p class="fw-semibold text-primary mb-1">${name}</p>
                        <p class="text-muted small">$${amount}</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="toggleEditExpense('${expenseId}')">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense('${expenseId}', '${tripId}')">Delete</button>
                    </div>
                `;
            }
            toggleEditExpense(expenseId); // Hide edit form after saving
        } else {
            alert("Failed to update expense.");
        }
    })
    .catch(err => console.error("Error updating expense:", err));
}

function deleteExpense(expenseId, tripId) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    fetch(`/itinerary/${tripId}/delete-expense/${expenseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById(`expense-${expenseId}`).remove();
        } else {
            alert("Failed to delete expense.");
        }
    })
    .catch(err => console.error("Error deleting expense:", err));
}
