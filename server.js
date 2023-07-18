require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 4000;

// Express is our web server
const app = express();
const server = require("http").createServer(app);

// Parse requests of content-type - application/json
const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

// Session middleware
const session = require("express-session");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Import routes
const homeRoutes = require("./routes/home");

// Use routes
app.get("*", homeRoutes);

// Start the server
server.listen(PORT, function () {
  console.log("listening on port 4000");
});

const { authorizeXero } = require("./controllers/xero");

authorizeXero();

// Run CRON
const { runCron } = require("./controllers/cron")(session);

runCron();
