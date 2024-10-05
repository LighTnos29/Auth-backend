const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post")
const cookieParser = require("cookie-parser");
const path = require("path");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get("/", (req, res) => {
    res.render("index");
});

app.post("/register", async (req, res) => {

    let { password, name, email, username, age } = req.body;
    let user = await userModel.findOne({ email });

    if (user) return res.status(500).send("User already existing.");

    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
            const newUser = await userModel.create({
                username,
                name,
                email,
                password: hash,
                age
            });

            let token = jwt.sign({ email: email, userid: newUser._id }, "shhhh");
            res.cookie("token", token);
            res.send("Registered")
        });
    });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    let { email, password } = req.body;

    let user = await userModel.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid username or password." });

    bcrypt.compare(password, user.password, function (err, result) {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            return res.status(200).redirect("home");
        }
        else return res.status(401).json({ message: "Invalid username or password." });
    });
});

app.get("/logout", async (req, res) => {
    res.cookie("token", "")
    res.redirect("/login")
});

app.get("/home", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate("posts")
    res.render("home", { user })
})

app.post("/post", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email })
    let { content } = req.body
    let post = await postModel.create({
        user: user._id,
        content,
    })

    user.posts.push(post._id);
    await user.save();
    res.redirect("/home");
})

function isLoggedIn(req, res, next) {
    if (req.cookies.token == "") res.send("You must login first.")
    else {
        let data = jwt.verify(req.cookies.token, "shhhh");
        req.user = data;
        next();
    }
}

app.listen(5000);