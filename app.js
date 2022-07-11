require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs  = require("ejs");
const mongoose = require("mongoose");
const bcyrpt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect(process.env.DB_URI);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({
        email: username,
    }, (err, foundUser) => {
        if(err) {
            console.log(err);
        } else {
            if(foundUser) {
                bcyrpt.compare(password, foundUser.password, (err, result) => {
                    if(err) {
                        console.log(err);
                    } else if (result === true) {
                        res.render("secrets");
                    }
                })
            }
        }
    })
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.post("/register", (req, res) => {

    bcyrpt.hash(req.body.password, saltRounds, (err, hash) => {
        if(err) {
            console.log(err);
        } else {
            const user = new User({
                email: req.body.username,
                password: hash
            })
        
            user.save((err) => {
                if(err) {
                    console.log(err);
                } else {
                    res.render("secrets");
                }
            })
        }
    })
    
})

app.get("/secrets", (req, res) => {
    res.render("secrets");
})

app.listen(3000, () => {
    console.log("Server started on Port 3000.");
})