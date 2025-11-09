const express = require("express");
const cors = require("cors");
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());

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

        //    users apis
        app.get('/users', async (req, res) => {
            const cursor = users.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // vehicles apis
        app.get('/vehicles', async (req, res) => {
            const cursor = vehicles.find();
            const result = await cursor.toArray();
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