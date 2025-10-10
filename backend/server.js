const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Backend chạy OK!");
});

app.listen(4000, () => console.log("✅ Server đang chạy ở http://localhost:4000"));

