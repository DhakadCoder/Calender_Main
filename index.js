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


const dburl = 'mongodb://localhost:27017/calender';
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

const sessionOptions = { secret: 'thisIsNotAGoodSecret', resave: false, saveUninitialized: false }
app.use(session(sessionOptions));

app.use(passport.initialize())
app.use(passport.session())
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    const dt = dateTime.create();
    const dateAndTime = dt.format('d-m-Y H:M:S');
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
            console.log("done")
            res.redirect('/dashboard')
        })
    } catch (e) {
        res.redirect('/dashboard')
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
app.listen(3000, () => {
    console.log("Noice")
})