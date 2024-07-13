import mongoose, { connect } from "mongoose";
import { DB_NAME } from "../constants.js"

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`\nMongoDB connected successfully!! DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log(`MongoDB connection failed: ${error}`);
        process.exit(1); 
    }
}

export default connectDB;


//NOTES: 
//read about more process.exit codes
//read about the promise returned by the mongoose.connect
