const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 3000;

const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

app.use(
    cors({
        origin: ["http://localhost:5173"],
        credentials: true,
    })
);
app.use(express.json());

const verifyFireBaseToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
    }
    const token = authorization.split(" ")[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.token_email = decoded.email;
        next();
    } catch (error) {
        return res.status(401).send({ message: "Unauthorized access" });
    }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9hcy35q.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

app.get("/", (req, res) => {
    res.send("TravelEase server is running...");
});

async function run() {
    try {
        // await client.connect();

        const db = client.db("travel_ease_db");
        const vehicles = db.collection("vehicles");
        const users = db.collection("users");
        const bookings = db.collection("bookings");

        app.get("/users", async (req, res) => {
            const result = await users.find().toArray();
            res.send(result);
        });

        app.post("/users", async (req, res) => {
            const newUser = req.body;
            const existingUser = await users.findOne({ email: newUser.email });
            if (existingUser) {
                return res.send({ message: "User already exists. No need to add again." });
            }
            const result = await users.insertOne(newUser);
            res.send(result);
        });

        app.get("/vehicles", async (req, res) => {
            const cursor = vehicles.find()
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/recentvehicles", async (req, res) => {
            const cursor = vehicles.find().sort({ createdAt: -1 }).limit(6)
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/vehicledetails/:id", verifyFireBaseToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await vehicles.findOne(query);
            res.send(result);
        });

        app.post("/vehicles", verifyFireBaseToken, async (req, res) => {
            const newVehicle = req.body;
            newVehicle.userEmail = req.token_email;
            const result = await vehicles.insertOne(newVehicle);
            res.send(result);
        });

        app.get("/myvehicles", verifyFireBaseToken, async (req, res) => {
            const email = req.query.email;
            const query = { userEmail: email }
            if (email) {
                query.userEmail = email
            }
            const myVehicles = vehicles.find(query);
            const result = await myVehicles.toArray()
            res.send(result);
        });

        app.patch("/myvehicles/:id", verifyFireBaseToken, async (req, res) => {
            const id = req.params.id;
            const email = req.token_email;
            const updatedData = req.body;
            const query = { _id: new ObjectId(id), userEmail: email };
            const updateVehicl = { $set: updatedData };
            const result = await vehicles.updateOne(query, updateVehicl);
            res.send({ result });
        });

        app.delete("/myvehicles/:id", verifyFireBaseToken, async (req, res) => {
            const id = req.params.id;
            const email = req.token_email;
            const query = { _id: new ObjectId(id), userEmail: email };
            const result = await vehicles.deleteOne(query);
            res.send(result);
        });

        app.post("/bookings", async (req, res) => {
            const newBooking = req.body;
            const result = await bookings.insertOne(newBooking);
            res.send(result);
        });

        app.get("/bookings", verifyFireBaseToken, async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.buyerEmail = email
            }
            const cursor = bookings.find(query)
            const result = await cursor.toArray();
            res.send(result);
        });

        app.delete("/bookings/:id", verifyFireBaseToken, async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid booking ID" });
            const result = await bookings.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        console.log("Connected to MongoDB successfully!");
    } finally {
        // Do not close the client here to keep it persistent
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`🚀 TravelEase server is running on port: ${port}`);
});
