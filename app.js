import express from "express";
import dbConnect from "./db.js";
import dotenv from "dotenv";
import studentRouter from "./routes/studentRoute.js";
import agencyRouter from "./routes/agencyRoute.js";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

dbConnect();

app.use("/api/v1/student", studentRouter);
app.use("/api/v1/agency", agencyRouter);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`App running on port ${port}`));
