Website Demonstration and Reflection Report

1. Application Demonstration

In this video, I will walk through my web application, highlighting its core functionalities and demonstrating how users interact with it. Below are some of the key actions that will be shown in the demonstration:

Creating a New Trip: Navigate to the "Add Trip" section, fill in the trip details (destination, budget, dates, etc.), and submit the form to create a new trip.

Filtering and Sorting Trips: Apply filters based on priority, category, budget, and status. Demonstrate sorting functionality if applicable.

Viewing Trip Details: Click on a trip to view its details, including itinerary, bookings, schedule, and expenses.

Adding and Editing Bookings: Show how to add different types of bookings (flights, hotels, etc.), edit their details, and save changes.

Managing Schedule: Demonstrate adding, editing, and deleting scheduled events for a trip.

Tracking Expenses: Add, edit, and delete expenses to update the total spent amount dynamically.

Marking a Trip as Completed: Attempt to mark an ongoing trip as completed before its end date to trigger an error message.

Error Handling: Show validation messages when invalid input is entered.

2. Code Review Using VS Code Timeline or Source Control Graph

After demonstrating the application, I will reflect on the development process using VS Code's Timeline view or Source Control Graph. I will cover the following aspects:

A. Bug Encountered and Fix

One of the major bugs I encountered was related to updating expenses. Initially, when an expense was edited, the new value was saved in the database but did not reflect dynamically in the UI, nor did it update the total spent amount.

Bug Explanation:

The edit form allowed users to change the expense amount, but the displayed total spent value remained unchanged until a full page refresh.

The updateExpense function was updating the individual expense amount but not recalculating the total.

Fix Implementation:

Implemented the updateTotalSpent function to dynamically sum up all displayed expense amounts.

Ensured that after editing an expense, the total spent field was recalculated and updated in the UI without requiring a page refresh.

Used toggleEditExpense to automatically hide the edit form upon saving changes.

B. Feature Implementation and Learning Process

One feature that required experimentation was handling asynchronous UI updates when adding or modifying records.

What I had to figure out:

How to update the list of expenses/bookings without refreshing the page.

How to retrieve new values and inject them into the DOM dynamically.

Approach Taken:

Used fetch API to send AJAX requests to update data on the server.

Implemented JavaScript functions to parse and update only the relevant parts of the UI after changes were made.

Reused DOM elements and event listeners to ensure an efficient update cycle.

External Resources Used:

Mozilla Developer Network (MDN) for Fetch API documentation.

Stack Overflow discussions on handling real-time UI updates.

C. Significant Commits

I will go over specific commits that illustrate the progression of the project:

Initial Structure Setup: Setting up Express.js routes, Mustache templates, and database tables.

Feature Implementation: Commit showing the integration of expense tracking, including adding and updating expenses dynamically.

Bug Fix Commits: Demonstrating changes made to fix UI update issues with expenses and bookings.

Error Handling Enhancements: Showing commits where validation logic was refined to provide better user feedback.

3. Conclusion

In this reflection, I have demonstrated the core functionalities of my web application, discussed a major bug and how I fixed it, highlighted a learning experience involving UI updates, and reviewed key commits that contributed to the project's development. This project has reinforced my understanding of full-stack development, real-time UI updates, and debugging strategies in web applications.

