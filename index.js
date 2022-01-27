if (process.env.NODE_ENV !== "production") {
    require('dotenv').config()
}
const express = require("express")
const app = express()
const ejs = require('ejs');
const path = require('path');
const session = require('express-session')
const ejsMate = require('ejs-mate')
const mongoose = require("mongoose")
const passport = require('passport')
const passportLocal = require('passport-local')
const User = require('./model/user');
const Calender = require("./model/calender");
const methodOverride = require('method-override');
const dateTime = require('node-datetime');
const ExpressError = require('./utils/ExpressError')
const { DateTime } = require('luxon');


const MongoDBStore = require("connect-mongo")(session);

const dburl = process.env.DB_URL || 'mongodb://localhost:27017/calender';
main().catch(err => console.log("Connection Error", err));

async function main() {
    await mongoose.connect(dburl);
    console.log("Database Connected")
}

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true })); // to parse the body for post request
app.use(methodOverride('_method'));

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = new MongoDBStore({
    url: dburl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})


const sessionOptions = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        //secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionOptions));

app.use(passport.initialize())
app.use(passport.session())
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    const date = DateTime.now().setZone("Asia/Kolkata");
    const dateAndTime = date.toLocaleString(DateTime.DATE_FULL) + ", Time: " + date.toLocaleString(DateTime.TIME_24_WITH_LONG_OFFSET);
    res.locals.currentUser = req.user;
    res.locals.dateAndTime = dateAndTime;
    next();
})

app.get('/', (req, res) => {
    res.redirect('/dashboard')
})
app.get('/dashboard', async (req, res) => {
    if (req.user) {
        const user = await req.user.populate('events')
        res.render('dashboard', { user })
    } else {
        res.render('dashboard')
    }
})

app.get('/newEvent', (req, res) => {
    res.render('newEvent')
})

app.post('/newEvent', async (req, res) => {
    const user = req.user
    const calender = new Calender(req.body)
    calender.person = req.user
    await calender.save()
    await user.events.push(calender)
    await user.save()
    res.redirect("/dashboard")
})

app.get('/dashboard/:eventId/edit', async (req, res) => {
    const { eventId } = req.params
    const event = await Calender.findById(eventId)
    res.render('editEvent', { event })
})

app.put('/dashboard/:eventId', async (req, res) => {
    const { eventId } = req.params
    const calender = await Calender.findByIdAndUpdate(eventId, { ...req.body }, { new: true });
    await calender.save()
    res.redirect('/dashboard')
})

app.delete('/dashboard/:eventId', async (req, res) => {
    const { eventId } = req.params
    const userid = req.user.id
    await User.findByIdAndUpdate(userid, { $pull: { events: eventId } });
    await Calender.findByIdAndDelete(eventId)
    res.redirect('/dashboard')
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body
        const user = new User({ email, username })
        const registeredUser = await User.register(user, password)
        req.login(registeredUser, err => {
            if (err) return next(err)
            res.redirect('/dashboard')
        })
    } catch (e) {
        res.redirect('/register')
    }
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', passport.authenticate('local', { failureFlash: false, failureRedirect: '/login' }), (req, res) => {
    const redirectUrl = req.session.returnToUrl || '/dashboard'
    delete req.session.returnToUrl
    res.redirect(redirectUrl)
})

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/dashboard')
})
app.all('*', (req, res, next) => {
    next(new ExpressError('Page not Found', 404));
})
app.use((err, req, res, next) => {
    const { statusCode = 404, message = 'something went wrong' } = err;
    res.status(statusCode).render('error', { err });
})


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Noice")
})