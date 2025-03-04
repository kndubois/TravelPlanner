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
    
    
    let date = document.getElementById("new-schedule-date").value;
    let activities = document.getElementById("new-schedule-activities").value;

    if (!tripId) {
        console.error("Trip ID is missing.");
        alert("Error: Trip ID is missing.");
        return;
    }

    fetch(`/itinerary/${tripId}/add-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, activities })
    })
    .then(response => response.json())
    .then(data => {

        if (data.success) {
            document.getElementById("schedule-list");
            let list = document.getElementById("schedule-list");
            list.innerHTML += `
                <div class="border rounded-3 p-3 mb-2 shadow-sm">
                    <p class="fw-semibold text-primary mb-1">${date}</p>
                    <p class="text-muted small">${activities}</p>
                </div>
            `;
            toggleAddSchedule();
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
    }).then(() => location.reload());
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
            list.innerHTML += `
                <div class="border rounded-3 p-3 mb-2 shadow-sm">
                    <p class="fw-semibold text-primary mb-1">${type}</p>
                    <p class="text-muted small">${details}</p>
                </div>
            `;
            toggleAddBooking();
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
    }).then(() => location.reload());
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