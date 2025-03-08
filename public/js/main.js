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


function markTripAsCompleted(tripId) {
    fetch(`/complete/${tripId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        let errorContainer = document.getElementById("trip-error-message");

        if (data.success) {
            window.location.href = "/mytrips";
        } else {
            errorContainer.innerHTML = data.message;
            errorContainer.classList.remove("d-none");
        }
    })
    .catch(err => {
        console.error("Error:", err);
        let errorContainer = document.getElementById("trip-error-message");
        errorContainer.innerHTML = "An error occurred. Please try again.";
        errorContainer.classList.remove("d-none");
    });
}


function toggleAddSchedule() {
    let form = document.getElementById("add-schedule-form");
    if (form) form.classList.toggle("d-none");
}


function submitNewSchedule(event, tripId) {

    event.preventDefault();

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
            fetch(`/itinerary/${tripId}`)
                .then(response => response.text())
                .then(html => {
                    let parser = new DOMParser();
                    let doc = parser.parseFromString(html, "text/html");
                    let updatedSchedule = doc.querySelector("#schedule-list").innerHTML;

                    if (updatedSchedule) {
                        document.getElementById("schedule-list").innerHTML = updatedSchedule;
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
    }
}


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
            toggleEditSchedule(scheduleId);
        } else {
            alert("Failed to update schedule.");
        }
    })
    .catch(err => console.error("Error:", err));
}



function deleteSchedule(scheduleId, tripId) {
    if (!confirm("Are you sure you want to delete this schedule item?")) return;

    fetch(`/itinerary/${tripId}/delete-schedule/${scheduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let scheduleElement = document.getElementById(`schedule-${scheduleId}`);
            if (scheduleElement) {
                scheduleElement.remove();
            } 
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

    let bookingData = { type, details };

    fetch(`/itinerary/${tripId}/add-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {

            fetch(`/itinerary/${tripId}`)
            .then(response => response.text())
            .then(html => {
                let parser = new DOMParser();
                let doc = parser.parseFromString(html, "text/html");
                let updatedBookingList = doc.querySelector("#booking-list").innerHTML;

                if (updatedBookingList) {
                    document.getElementById("booking-list").innerHTML = updatedBookingList;
                }
            });
            document.getElementById("new-booking-type").value = "";
            document.getElementById("new-booking-details").value = "";
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


function updateBooking(event, bookingId) {
    event.preventDefault();

    let tripId = document.getElementById("trip-id").value; 
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
            toggleEditBooking(bookingId); 
        } else {
            alert("Failed to update booking.");
        }
    })
    .catch(err => console.error("Error updating booking:", err));
}


function deleteBooking(bookingId, tripId) {
    if (!confirm("Are you sure you want to delete this booking?")) return;

    fetch(`/itinerary/${tripId}/delete-booking/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById(`booking-${bookingId}`).remove(); 
        } else {
            alert("Failed to delete booking.");
        }
    })
    .catch(err => console.error("Error:", err));
}




function toggleAddExpense() {
    let form = document.getElementById("add-expense-form");
    if (form) form.classList.toggle("d-none");
}


function toggleEditExpense(expenseId, forceClose = false) {
    let form = document.getElementById(`edit-expense-form-${expenseId}`);
    if (form) {
        if (forceClose) {
            form.classList.add("d-none"); 
        } else {
            form.classList.toggle("d-none");
        }
    } 
}


function updateTotalSpent() {
    let totalSpentElement = document.getElementById("total-spent");
    let expenses = document.querySelectorAll(".expense-amount");
    let total = 0;
    expenses.forEach(expense => {
        let amountText = expense.textContent.replace(/[^0-9.-]+/g, "");
        let amount = parseFloat(amountText);
        if (!isNaN(amount)) {
            total += amount;
        }
    });
    totalSpentElement.innerText = `$${total.toFixed(2)}`;
    totalSpentElement.dataset.spent = total;
}



function submitExpense(event) {
    event.preventDefault();

    let tripId = document.getElementById("trip-id").value;
    let name = document.getElementById("expense-name").value;
    let amount = parseFloat(document.getElementById("expense-amount").value);

    if (!tripId) {
        console.error("Trip ID is missing.");
        return;
    }

    let expenseData = { name, amount };

    fetch(`/itinerary/${tripId}/add-expense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetch(`/itinerary/${tripId}`)
                .then(response => response.text())
                .then(html => {
                    let parser = new DOMParser();
                    let doc = parser.parseFromString(html, "text/html");
                    document.getElementById("expense-list").innerHTML = doc.querySelector("#expense-list").innerHTML;
                    updateTotalSpent(); 
                });
            document.getElementById("expense-name").value = "";
            document.getElementById("expense-amount").value = "";
            toggleAddExpense();
        }
    })
    .catch(err => console.error("Error:", err));
}

function updateExpense(event, expenseId, tripId) {
    event.preventDefault();
    let name = document.getElementById(`edit-expense-name-${expenseId}`).value.trim();
    let newAmount = parseFloat(document.getElementById(`edit-expense-amount-${expenseId}`).value);

    fetch(`/itinerary/${tripId}/edit-expense/${expenseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount: newAmount })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetch(`/itinerary/${tripId}`)
                .then(response => response.text())
                .then(html => {
                    let parser = new DOMParser();
                    let doc = parser.parseFromString(html, "text/html");
                    document.getElementById("expense-list").innerHTML = doc.querySelector("#expense-list").innerHTML;
                    updateTotalSpent(); 
                });
            toggleEditExpense(expenseId, true);
        }
    })
    .catch(err => console.error("Error:", err));
}



function deleteExpense(expenseId, tripId) {
    fetch(`/itinerary/${tripId}/delete-expense/${expenseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let expenseElement = document.getElementById(`expense-${expenseId}`);
            if (expenseElement) {
                expenseElement.remove();
            }
            updateTotalSpent();
        }
    })
    .catch(err => console.error("Error deleting expense:", err));
}
