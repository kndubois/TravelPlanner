function startCountdown(targetDate, elementId) {
    const countdownElement = document.getElementById(elementId);

    console.log("Original date received:", targetDate);

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

        countdownElement.innerHTML = `<span>${days} days ${hours} hours ${minutes} minutes</span>`;
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
    document.getElementById("add-schedule-form").classList.toggle("d-none");
}


function submitNewSchedule(event, tripId) {
    event.preventDefault();
    
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
        console.log("Server response:", data);

        if (data.success) {
            document.getElementById("schedule-list").innerHTML += `
                <div class="border-bottom py-2 d-flex justify-content-between">
                    <div>
                        <p class="fw-semibold mb-1">${date}</p>
                        <p class="text-muted small">${activities}</p>
                    </div>
                </div>
            `;
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
        console.log("Server response:", data);

        if (data.success) {
            document.getElementById("schedule-list").innerHTML += `
                <div class="border-bottom py-2 d-flex justify-content-between">
                    <div>
                        <p class="fw-semibold mb-1">${date}</p>
                        <p class="text-muted small">${activities}</p>
                    </div>
                </div>
            `;
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
    const form = document.getElementById(`edit-schedule-form-${scheduleId}`);
    form.classList.toggle("d-none");
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
            location.reload(); // Refresh page after update
        } else {
            alert("Failed to update schedule.");
        }
    })
    .catch(err => console.error("Error:", err));
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
            document.getElementById(`schedule-${scheduleId}`).remove(); // Remove item from UI
        } else {
            alert("Failed to delete schedule.");
        }
    })
    .catch(err => console.error("Error:", err));
}




function toggleAddBooking() {
    document.getElementById("add-booking-form").classList.toggle("d-none");
}

// Toggle edit form visibility for bookings
function toggleEditBooking(bookingId) {
    const form = document.getElementById(`edit-booking-form-${bookingId}`);
    form.classList.toggle("d-none");
}

function submitNewBooking(event) {
    event.preventDefault();

    // Get the trip ID from the hidden input
    let tripId = document.getElementById("trip-id").value;
    let type = document.getElementById("new-booking-type").value;
    let details = document.getElementById("new-booking-details").value;

    if (!tripId) {
        console.error("Trip ID is missing.");
        alert("Error: Trip ID is missing.");
        return;
    }

    console.log("Submitting Booking:", { tripId, type, details });

    fetch(`/itinerary/${tripId}/add-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Server response:", data);

        if (data.success) {
            document.getElementById("booking-list").innerHTML += `
                <div class="booking-item border rounded-3 p-3 mb-2 shadow-sm" id="booking-${data.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <p class="fw-semibold mb-1 text-primary">${type}</p>
                            <p class="text-muted small">${details}</p>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-secondary" onclick="toggleEditBooking('${data.id}')">Edit</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteBooking('${data.id}', '${tripId}')">Delete</button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById("add-booking-form").classList.add("d-none");
            document.getElementById("new-booking-type").value = "";
            document.getElementById("new-booking-details").value = "";
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
function updateBooking(event, bookingId, tripId) {
    event.preventDefault();

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
            location.reload(); // Refresh page after update
        } else {
            alert("Failed to update booking.");
        }
    })
    .catch(err => console.error("Error:", err));
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