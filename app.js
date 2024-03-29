require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs  = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate")

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,

}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DB_URI);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GoogleStrategy(
    {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id, username: profile.emails[0].value }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", (req, res) => {
    res.render("home");
})

app.get("/auth/google", passport.authenticate("google", {scope: ["email", "profile"]}));

app.get(
    "/auth/google/secrets", 
    passport.authenticate("google", {failureRedirect: "/login"}), 
    (req, res) => {
        res.redirect("/secrets");
    }
)

app.get("/login", (req, res) => {
    res.render("login");
})

app.post(
    '/login', 
    passport.authenticate('local', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/secrets');
    }
);

app.get("/register", (req, res) => {
    res.render("register");
})

app.post("/register", (req, res) => {

    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            })
        }
    })
    
})

app.get("/secrets", (req, res) => {
    User.find({"secret": {$ne: null}}, (err, foundUsers) => {
        if(err) {
            console.log(err);
        } else {
            res.render("secrets", {usersWithSecrets: foundUsers});
        }
    })
})

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
})

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user._id, (err, foundUser) => {
        if(err) {
            console.log(err);
        } else {
            foundUser.secret = submittedSecret;
            foundUser.save((err) => {
                if(err) {
                    console.log(err);
                } else {
                    res.redirect("/secrets");
                }
            })
        }
    })
})

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if(err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
})

app.listen(3000, () => {
    console.log("Server started on Port 3000.");
})