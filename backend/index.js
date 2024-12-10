import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import cors from 'cors';
import dbConnection from './src/config.js';
import SignupModel from './src/models/signupModels.js';
const jwtSecret = 'onesimulation||onelearning';
import path from 'path';


// Initialize Express app
const app = express();
app.use(cors(
  {
    origin: ["https://front-end-one-simulation.vercel.app"],
    methods: ["POST","GET"],
    credentials: true
  }
));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
dbConnection();


// routing for the teacher page
app.get('/teachers', (req, res) => {
  res.sendFile(path.join(__dirname, 'teachers.html')); // Serve the send.html file when /send is accessed
});

//routing the student page
app.get('/students', (req, res) => {
  res.sendFile(path.join(__dirname, 'students.html')); // Serve the receive.html file when /receive is accessed
});

// Register (Signup) route
app.post('/signup', async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await SignupModel.findOne({ email }); // Change from username to email
    if (existingUser) {
      return res.status(400).send('User already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user to the database
    const user = new SignupModel({
      fullname: fullname,
      email: email,
      password: hashedPassword,
    });

    await user.save();
    console.log('Registration successful: ', user._id);

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });

    const result = { message: 'User successfully signed up', token: token };
    res.status(200).send(result);
  } catch (error) {
    console.log('Server error:', error.message);
    res.status(500).send({ message: 'Server error', error: error.message });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user in the database
    const user = await SignupModel.findOne({ email });
    if (!user) {
      console.log('User does not exist');
      return res.status(400).send('Invalid email or password');
    }

    // Compare the password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid email or password');
      return res.status(400).send('Invalid email or password');
    }

    // Generate a JWT token
    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });

    const result = { message: 'Login successful', token: token };
    console.log(result);
    res.status(200).send(result);
  } catch (error) {
    console.log('Server error:', error.message);
    res.status(500).send({ message: 'Server error', error: error.message });
  }
});



let clients = [];

app.post('/teacher-graph-data', (req, res) => {
  // console.log(req.body);
  const  simulatedData = req.body;
  if (simulatedData) {
    try {
      console.log('simulated Data on server: ', simulatedData);
      sendEventsToAll(simulatedData); // Send the data to all clients via SSE
      res.status(200).json({ message: 'Data sent to students', data: simulatedData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to broadcast data' });
    }
  } else {
    res.status(400).json({ error: 'No data received from teachers' });
  }
});

app.get('/transferData', (req, res) => {
  // Set headers for SSE (text/event-stream)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');  // Prevent caching
  res.setHeader('Connection', 'keep-alive');   // Keep the connection alive

  // Send an initial keep-alive message to the client
  res.write(': keep-alive\n\n');  // ':' sends a comment, which is ignored by the client
  
  // Add the client to the list of connected clients
  clients.push(res);

  // console.log('Client connected. Total clients:',clients);

  // Remove the client from the list when they disconnect
  req.on('close', () => {
    clients = clients.filter(client => client !== res);
    console.log('Client disconnected. Total clients:', clients.length);
  });

  // Do not send a response like `res.send()`, as the connection should stay open
});
                                                

const sendEventsToAll = (data) => {
  // Convert the object data to a JSON string
  const jsonData = JSON.stringify(data);

  // Loop through all clients and send the data in SSE format
  clients.forEach((client) => {
    client.write(`data: ${jsonData}\n\n`); // Send the JSON string to each client
  });
};

let latestSpo2Data = {}; // Store the latest SpO2 data

// Endpoint to receive data from teacher section
app.post('/teacher-Spo2-data', (req, res) => {
  const { spo2value } = req.body;
  latestSpo2Data.spo2value = spo2value; // Save the latest SpO2 value
  console.log("LATE NIGHT CHECK" ,latestSpo2Data.spo2value)
  console.log('Received SpO2 data from teacher:', spo2value);
  res.json({ message: 'SpO2 data received successfully' });
});

// SSE endpoint to broadcast SpO2 data to student section
app.get('/student-spo2-data', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send SpO2 data at intervals
  const intervalId = setInterval(() => {
    res.write(`data: ${JSON.stringify(latestSpo2Data)}\n\n`);
  }, 1000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});
let latestPulseData = {}; // Store the latest SpO2 data

// Endpoint to receive data from teacher section
app.post('/teacher-Pulse-data', (req, res) => {
  const { pulsevalue } = req.body;
  console.log("LATE NIGHT CHECK PULSE VALUE", pulsevalue);
  if (pulsevalue !== undefined) {
    latestPulseData.pulsevalue = pulsevalue; // Store the latest pulse value
    console.log('Updated pulse data:', latestPulseData); // Log the updated data
    res.json({ message: 'Pulse data received successfully' });
  } else {
    res.status(400).json({ message: 'Pulse value is missing' });
  }
});

// SSE endpoint to broadcast SpO2 data to student section
// Assuming latestPulseData is the variable holding the most recent pulse data
 // Store the latest pulse data

 app.get('/student-Pulse-data', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send pulse data at intervals
  const intervalId = setInterval(() => {
    if (latestPulseData.pulsevalue !== undefined) {
      console.log('Sending pulse data to student:', latestPulseData);
      res.write(`data: ${JSON.stringify(latestPulseData)}\n\n`); // Send the latest pulse data
    } else {
      console.log('Pulse data is not yet available');
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});






let bpCommand = '';
let spo2Command = '';
let pulseCommand = '';

// Endpoint to receive BP data from Arduino and control the BP chart
// app.post('arduino-data-bp', (req, res) => {
  // const { command } = req.body;
  // console.log("request from aurdino: ", command);
  // if (command === 'STOP') {
  //   bpCommand = 'STOP';
  // } else if (command === 'START') {
  //   bpCommand = 'START';
  // }

  // console.log(`BP command received: ${bpCommand}`);
//   res.json({ status: 'success', command: bpCommand });
// });

app.post('/arduino-data-bp', (req, res) => {
  const { sensor, value } = req.body;  // Extract the sensor data from the body
  console.log("Request from Arduino: ", req.body);

  // Example handling of the command (could be extended based on sensor data)
  if (sensor && value) {
    console.log(`Sensor: ${sensor}, Value: ${value}`);
  }

  res.json({ status: 'success' });  // Send success response back
});

// Endpoint to receive SpO2 data from Arduino and control the SpO2 chart
app.post('/arduino-data-spo2', (req, res) => {
  const { command } = req.body;
  console.log("Request received:", req.body);

  if (command === 'STOP') {
    spo2Command = 'STOP';
  } else if (command === 'START') {
    spo2Command = 'START';
  }

  console.log(`SpO2 command received: ${spo2Command}`);
  res.json({ status: 'success', command: spo2Command });
});

// Endpoint to receive Pulse data from Arduino and control the Pulse chart
app.post('/arduino-data-pulse', (req, res) => {
  const { command } = req.body;

  if (command === 'STOP') {
    pulseCommand = 'STOP';
  } else if (command === 'START') {
    pulseCommand = 'START';
  }

  console.log(`Pulse command received: ${pulseCommand}`);
  res.json({ status: 'success', command: pulseCommand });
});

// Endpoint to get the current status of all commands for each chart
app.get('/status', (req, res) => {
  res.json({
    bpCommand,
    spo2Command,
    pulseCommand
  });
});

// app.get('/arduino-data-bp', (req, res) => {
//   // Example response for testing purposes
//   res.json({ command: 'START' }); // Or 'STOP' based on your logic
// });




// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
