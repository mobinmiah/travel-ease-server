const express = require("express");
const cors = require("cors");
require('dotenv').config();
// const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;

// index.js
const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middlewares
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
        return res.status(401).send({ message: 'Unauthorized access' })
    }

    const token = authorization.split(' ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);

        req.token_email = decoded.email;
        next();
    }
    catch {
        return res.status(401).send({ message: 'Unauthorized access' })

    }
}

// connection string
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9hcy35q.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


app.get('/', (req, res) => {
    res.send('travelease is running')
})

async function run() {
    try {
        await client.connect();

        const db = client.db("travel_ease_db");
        const vehicles = db.collection("vehicles");
        const users = db.collection("users");
        const bookings = db.collection("bookings");

        //    users apis
        app.get('/users', async (req, res) => {
            const cursor = users.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email };
            const existingUser = await users.findOne(query)
            if (existingUser) {
                res.send({ message: 'User allready exist. no need add again' })
            }
            else {
                const result = await users.insertOne(newUser);
                res.send(result);
            }
        })

        // vehicles apis
        app.get('/vehicles', async (req, res) => {
            const cursor = vehicles.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        app.get('/vehicles', async (req, res) => {
            console.log(query.email)
            const email = req.query.email;
            const query = {};
            if (email) {
                query.userEmail = email;
            }
            if (email !== req.token_email) {
                res.status(403).send({ message: 'Fobidden access' })
            }

            const cursor = bookings.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/recentvehicles', async (req, res) => {
            const cursor = vehicles.find().sort({ createdAt: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/vehicledetails/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await vehicles.findOne(query);
            res.send(result);
        })



        app.post('/vehicles', verifyFireBaseToken, async (req, res) => {
            const newVehicle = req.body;
            const result = await vehicles.insertOne(newVehicle);
            res.send(result);
        })

        app.get("/myvehicles", verifyFireBaseToken, async (req, res) => {
            try {
                const email = req.query.email;
                if (email !== req.token_email) {
                    return res.status(403).send({ message: "Forbidden access" });
                }
                const query = { userEmail: email };
                const myVehicles = vehicles.find(query)
                const result = await myVehicles.toArray();
                res.send(result);
            } catch {

            }
        });

        app.patch("/myvehicles/:id", verifyFireBaseToken, async (req, res) => {
            try {
                const id = req.params.id;
                const updatedData = req.body;
                const email = req.token_email;

                    // Check valid ObjectId
                    if (!ObjectId.isValid(id)) {
                        return res.status(400).json({ message: "Invalid vehicle ID" });
                    }

                // Ensure user owns the vehicle
                const query = { _id: new ObjectId(id), userEmail: email };

                // Set updated fields
                const updateVehicle = { $set: updatedData };

                // Perform update
                const result = await vehicles.updateOne(query, updateVehicle);

                if (result.matchedCount === 0) {
                    return res
                        .status(403)
                        .json({ message: "Unauthorized or vehicle not found" });
                }

                res.status(200).json({
                    message: "Vehicle updated successfully",
                    result,
                });
            } catch (error) {
                console.error("Error updating vehicle:", error);
                res.status(500).json({
                    message: "Internal server error while updating vehicle",
                    error: error.message,
                });
            }
        });


        // app.patch("/myvehicles/:id", verifyFireBaseToken, async (req, res) => {
        //     try {
        //         const id = req.params.id;
        //         const updatedData = req.body;
        //         const email = req.token_email;
        //         const query = { _id: new ObjectId(id), userEmail: email };
        //         const updateVehicle = { $set: updatedData };
        //         const result = await vehicles.updateOne(query, updateVehicle);
        //         res.send(result);
        //     } catch {

        //     }
        // });

        app.delete("/myvehicles/:id", verifyFireBaseToken, async (req, res) => {
            try {
                const id = req.params.id;
                const email = req.token_email;
                const query = { _id: new ObjectId(id), userEmail: email };
                const result = await vehicles.deleteOne(query);
                res.send(result);
            } catch {

            }
        });

        // bookings apis
        app.post('/bookings', async (req, res) => {
            const newBooking = req.body;
            const result = await bookings.insertOne(newBooking);
            res.send(result);
        })

        app.get('/bookings', verifyFireBaseToken, async (req, res) => {
            const email = req.query.email;
            const query = {};

            if (email) {
                query.buyerEmail = email;
            }

            if (email !== req.token_email) {
                return res.status(403).send({ message: 'Forbidden access' });
            }

            console.log(query);
            const cursor = bookings.find(query);
            const result = await cursor.toArray();

            res.send(result);
        });

        app.delete('/bookings/:id', verifyFireBaseToken, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await bookings.deleteOne(query);
                res.send(result);
            } catch {
            }
        });

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`travel ease server is running on port: ${port}`)
})