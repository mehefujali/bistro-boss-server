const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 8080;
//Middle ware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
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
