const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;


app.use(cors())
app.use(express.json());


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

        app.get("/vehicledetails/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await vehicles.findOne(query);
            res.send(result);
        });

        app.post("/vehicles", async (req, res) => {
            const newVehicle = req.body;
            const result = await vehicles.insertOne(newVehicle);
            res.send(result);
        });

        app.get("/myvehicles", async (req, res) => {
            const email = req.query.email;

            if (!email) {
                return res.status(401).send({ message: "Unauthorized access" });
            }

            const query = { userEmail: email };
            const result = await vehicles.find(query).toArray();

            res.send(result);
        });


        app.patch("/myvehicles/:id", async (req, res) => {
            const id = req.params.id;
            const email = req.token_email;
            const updatedData = req.body;
            const query = { _id: new ObjectId(id), userEmail: email };
            const updateVehicl = { $set: updatedData };
            const result = await vehicles.updateOne(query, updateVehicl);
            res.send({ result });
        });

        app.delete("/myvehicles/:id", async (req, res) => {
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

        app.get("/bookings", async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.buyerEmail = email
            }
            const cursor = bookings.find(query)
            const result = await cursor.toArray();
            res.send(result);
        });

        app.delete("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const result = await bookings.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        console.log("Connected to MongoDB successfully!");
    } finally {

    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`TravelEase server is running on port: ${port}`);
});
