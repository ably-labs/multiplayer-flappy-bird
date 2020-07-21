const envConfig = require("dotenv").config();
const express = require("express");
const Ably = require("Ably");

const app = express();
app.use(express.static("public"));

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/index.html");
});

const listener = app.listen(process.env.PORT, () => {
  console.log("App is listening on port " + listener.address().port);
});
