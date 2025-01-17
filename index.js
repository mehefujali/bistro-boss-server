const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 8080;
//Middle ware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.negmw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const menuCollection = client.db("bistro-boss").collection("menu");
    const cartCollection = client.db("bistro-boss").collection("cart");
    const userCollection = client.db("bistro-boss").collection("user");
    const paymentCollection = client.db("bistro-boss").collection("payment");

    // middlewares

    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ massage: "unauthorize access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ massage: "unauthorize access" });
        }
        req.decoded = decoded;

        next();
      });
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ massage: "forbidden" });
      }
      next();
    };

    // jwt releted api

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2hr",
      });
      res.send({ token });
    });

    // user releted api

    app.post("/users", async (req, res) => {
      const user = req.body;

      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({ massage: "user already exist" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/user/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (!req.decoded.email === email) {
        return res.status(403).send({ massage: "forbidden" });
      }
      const result = await userCollection.findOne({ email: email });
      let isAdmin = false;
      if (result) {
        isAdmin = result?.role === "admin";
      }
      res.send({ isAdmin });
    });

    // food releted

    app.get("/menu", async (req, res) => {
      const menu = await menuCollection.find().toArray();
      res.send(menu);
    });
    app.post("/cart", async (req, res) => {
      try {
        const result = await cartCollection.insertOne(req.body);
        res.send(result);
      } catch {
        res.send({ status: false });
      }
    });
    app.get("/cart", async (req, res) => {
      const email = req.query.email;

      const cart = await cartCollection.find({ email: email }).toArray();
      res.send(cart);
    });
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/cart/quantity/:id", async (req, res) => {
      const quantity = req.body;
      const id = req.params.id;
      const updateDoc = {
        $set: {
          quantity,
        },
      };
      const result = await cartCollection.updateOne({ _id: new ObjectId(id) } , updateDoc);
      res.send(result);
    });

    // add food releted

    app.post("/food", verifyToken, verifyAdmin, async (req, res) => {
      const foodItem = req.body;
      const result = await menuCollection.insertOne(foodItem);
      res.send(result);
    });

    // Payment

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment save
    app.post("/payment-save", async (req, res) => {
      const paymentDetails = req.body;
      const result = await paymentCollection.insertOne(paymentDetails);

      const query = {
        _id: {
          $in: paymentDetails.cartId.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartCollection.deleteMany(query);
      res.send({ result, deleteResult });
    });

    console.log("You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  try {
    res.send({
      status: true,
    });
  } catch {
    res.send({
      status: false,
    });
  }
});

app.listen(port, () => {
  console.log("SURVER IN RUNNING ON PORT :", port);
});
