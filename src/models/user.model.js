import mongoose, { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";


const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true, //to help in searching 
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, //cloudnary url
            required: true,
        },
        coverImage: {
            type: String,
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, "password is required"],
        },
        refreshToken: {
            type: String,
        }
    }, {timestamps: true}
)

//here do not write arrow function as we need this reference
//encrypting the password before saving the password into mongodb
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) next();

    this.password = await bcryptjs.hash(this.password, 10);
    next();
})

//checking if the password entered is correct or not while login
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcryptjs.compare(password, this.password);
}

//create access and refresh token in .env file first
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}


export const User = model("User", userSchema);