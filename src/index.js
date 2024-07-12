// require('dotenv').config({path: './env'}) //to make all the variables in the dot env everywhere, this is also used but it break the consistency of the code so new way is introduced

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

//you have to update your json script as "dev": "nodemon -r dotenv/config --experimental-json-modules src/index.js",
//--experimental-json-modules: This flag is specific to enabling experimental support for JSON modules in Node.js.
dotenv.config({
    path: './env',
})

const port = process.env.PORT || 8000;

//connectDB also gets a promise
connectDB()
.then(()=>{
    app.on("error", (error)=>{
        console.log(`ERR connecting db in src/index.js: ${error}`);
    })

    app.listen(port, ()=>{
        console.log(`Server is running on port ${port}`);
    })
})
.catch((error)=>{
    console.log(`DB connection failed in src/index.js: ${error}`);
})
































//***************first approach to connect to database in index file*********** */
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
// import express from "express"

// const app = express();
// const port = process.env.PORT || 8000;

// ;( async ()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
//         app.on("error", (error)=>{
//             console.log(`ERR CONNECTING DB: ${error}`);
//             throw error;
//         })

//         app.listen(port, ()=>{
//             console.log(`App is running on: ${port}`);
//         })
//     } catch (error) {
//         console.log(`mongodb connection failed: ${error}`);
//         throw error;
//     }
// })()