import mongoose from "mongoose";

const MONOG_URI = "mongodb+srv://babloocse888:onesimulationrandompassword@signup.gtual.mongodb.net/authDB?retryWrites=true&w=majority&appName=signups";


async function dbConnection() {
    try {
        await mongoose.connect(MONOG_URI, {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });
        console.log("Mongodb connection successfully");
    } catch (error) {
        console.error("Error connecting to the database: ", error.message);
    }

    mongoose.connection.on("connected", () => {
        console.log("Mongoose default connection is open.");
    });

    mongoose.connection.on("error", (err) => {
        console.log("Mongoose default connection error: ", err.message);
    });

    mongoose.connection.on("disconnected", () => {
        console.log("Mongoose default connection is disconnected.");
    });
}

// Call the function to establish a connection
export default dbConnection;