# TravelPlanner

TravelPlanner is a web-based trip management application that allows users to plan, organize, and track their trips in a structured way. Users can create itineraries, manage bookings, set reminders, and track expenses while traveling.

# useful information

## install dependancies
```
npm install
```

## packages
```
- express mustache-express express-session sqlite3 
- bcryptjs@2.4.3
- connect-flash passport passport-local
- dotenv 
```

## node.js
```
npm install node.js
node app.js
ctrl + c to refresh
```


## nodemon
```
npm install -g nodemon
nodemon app.js
use rs to refresh
```

## database
```
sqlite3 config/database.db
```

## running the application
```
node app.js
```

## github
```
git add .
git commit -m "updated"
git push -u origin main
```






-------------- TO DO LIST: 

fix dates in mytrips 
make booking details look better with bookings. 
like if flight is selected, it should have flight details
etc



Flight Details on the side 
Airport:
Departure time:
Airport:
Arrival time: 



And to answer at @Rajvi Lathia’s good question, I just wanted to look at the project again first.  :-)  You shouldn’t use Router for this, there isn’t any need for it, you can just use ‘app’ like the example we did in-class for MVC as defined in Week 5.  I suppose you could use a custom / self-made middleware though if you liked.  I’d suggest keeping it simple and not using a custom middleware for this project, but a custom middleware could for example fetch data that always needed to be fetched no matter what the page.


make a to-do list checklist?

like 

before you go:
clean apartment
put boarding pass, wallet and passport together

to do list:
book flights
book hotels
set budget
boarding pass
wallet
passport
etc???
