import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();


//adding middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}));

app.use(express.static("public"));
app.use(cookieParser());


//setting routes

//import routes
import {router as userRouter}  from "./routes/user.routes.js";

//routes declaration : https://localhost:8000/api/v1/users/register
app.use("/api/v1/users", userRouter);


export { app };


// NOTES:
//read about cors({}) // options it can take