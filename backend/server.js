import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
const app = express();
const http = createServer(app);
const io = new SocketIOServer(http);
const port = process.env.PORT || 5000;

app.use(express.json());

// Store received data
let data = {};

// API Endpoint to receive data from Arduino
app.post("/arduino-data", (req, res) => {
  data = req.body; // Store the latest data
  console.log("Received Data:", data);
  io.emit("update", data); // Emit data to frontend
  res.json({ message: "Data received successfully", data });
});

// Serve the frontend (optional for simplicity)
app.get("/", (req, res) => {
  res.send("Backend is live");
});

// Start server
http.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
