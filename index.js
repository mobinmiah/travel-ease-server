const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9hcy35q.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// JWT verification
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Forbidden" });
        }
        req.user = decoded;
        next();
    });
};

// jwt api
app.post("/jwt", (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send({ message: "Email required" });
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    res.send({ token });
});

app.get("/", (req, res) => {
    res.send("TravelEase server is running...");
});

async function run() {
    try {
        // await client.connect();

        const db = client.db("travel_ease_db");
        const users = db.collection("users");
        const vehicles = db.collection("vehicles");
        const bookings = db.collection("bookings");

        // users
        app.post("/users", async (req, res) => {
            const user = req.body;
            const exists = await users.findOne({ email: user.email });

            if (exists) {
                return res.send({ message: "User already exists" });
            }

            const result = await users.insertOne(user);
            res.send(result);
        });

        app.get("/users/me", verifyToken, async (req, res) => {
            const decodedEmail = req.user.email;
            const query = {}
            if (decodedEmail) {
                query.email = decodedEmail
            }
            const user = await users.findOne(query);

            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }

            res.send(user);
        });
        app.patch("/users/me", verifyToken, async (req, res) => {
            const decodedEmail = req.user.email;
            const updatedData = req.body;

            const updatedProfile = { $set: updatedData };

            const result = await users.updateOne({ email: decodedEmail }, updatedProfile);

            res.send(result);
        });

        // vehicles
        app.get("/vehicles", async (req, res) => {
            const { search = "", category, sort = "createdAt", order = "desc" } = req.query;

            const query = {
                ...(category && { category }),
                $or: [
                    { vehicleName: { $regex: search, $options: "i" } },
                    { location: { $regex: search, $options: "i" } },
                ],
            };

            const result = await vehicles
                .find(query)
                .sort({ [sort]: order === "desc" ? -1 : 1 })
                .toArray();

            res.send(result);
        });

        app.get("/recentvehicles", async (req, res) => {
            const result = await vehicles
                .find()
                .sort({ createdAt: -1 })
                .limit(8)
                .toArray();

            res.send(result);
        });

        app.get("/vehicledetails/:id", async (req, res) => {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid vehicle ID" });
            }

            const result = await vehicles.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.post("/vehicles", verifyToken, async (req, res) => {
            const vehicle = {
                ...req.body,
                userEmail: req.user.email,
                createdAt: new Date(),
            };

            delete vehicle._id;

            const result = await vehicles.insertOne(vehicle);
            res.send(result);
        });

        app.get("/myvehicles", verifyToken, async (req, res) => {
            const result = await vehicles
                .find({ userEmail: req.user.email })
                .toArray();

            res.send(result);
        });

        app.patch("/myvehicles/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;

            const query = {
                _id: new ObjectId(id),
                userEmail: req.user.email,
            };
            const updatedVehicle = {
                $set: updatedData,
            }
            const result = await vehicles.updateOne(query, updatedVehicle);

            res.send(result);
        });

        app.delete("/myvehicles/:id", verifyToken, async (req, res) => {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid vehicle ID" });
            }

            const result = await vehicles.deleteOne({
                _id: new ObjectId(id),
                userEmail: req.user.email,
            });

            res.send({ success: true, result });
        });

        /* ================= BOOKINGS ================= */

        app.post("/bookings", verifyToken, async (req, res) => {
            const booking = {
                ...req.body,
                buyerEmail: req.user.email,
                createdAt: new Date(),
            };

            delete booking._id;

            const result = await bookings.insertOne(booking);
            res.send(result);
        });

        app.get("/bookings", verifyToken, async (req, res) => {
            const result = await bookings
                .find({ buyerEmail: req.user.email })
                .toArray();

            res.send(result);
        });

        app.delete("/bookings/:id", verifyToken, async (req, res) => {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid booking ID" });
            }

            const result = await bookings.deleteOne({
                _id: new ObjectId(id),
                buyerEmail: req.user.email,
            });

            res.send({ success: true, result });
        });

        console.log("✅ MongoDB connected");
    } finally {
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`🚀 TravelEase server running on port ${port}`);
});
