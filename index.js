const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 8080;
//Middle ware
app.use(cors());
app.use(express.json());















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

app.listen(port, ()=>{
      console.log("SURVER IN RUNNING ON PORT :" , port)
})
