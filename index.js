const express = require("express");
const cors = require("cors");
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

const serviceAccount = require("./travel-ease-firebase-admin-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middlewares
app.use(cors());
app.use(express.json());

const verifyFireBaseToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authorization.split(' ')[1]
    
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        console.log('inside token', decoded)
        req.token_email = decoded.email;
        next();
    }
    catch (error) {
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

        app.get('/recentvehicles', async (req, res) => {
            const cursor = vehicles.find().sort({ createdAt: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/vehicles/:id', verifyFireBaseToken, async (req, res) => {
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

        // bookings apis
        app.get('/bookings', async (req, res) => {
            const cursor = bookings.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const newBooking = req.body;
            const result = await bookings.insertOne(newBooking);
            res.send(result);
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`travel ease server is running on port: ${port}`)
})