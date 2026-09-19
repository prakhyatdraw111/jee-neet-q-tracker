const express = require("express");

const app = express();

require("dotenv").config();

app.use(express.json());

app.use(require("express-ejs-layouts"));

app.use(express.static("./public"));

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));

app.set("layout", "./layouts/main");

app.use("/", require("./server/routes/main.js"));

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});