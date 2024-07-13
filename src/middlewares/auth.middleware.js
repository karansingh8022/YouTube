import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import Jwt from "jsonwebtoken";

const verifyJWT = asyncHandler ( async(req, res, next) => {
    try {
        //you may have access to cookies or user may be coming from mobile application then we get header Authorization
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token) { throw new ApiError(401, "verifyJWT!! unauthorized access") }
    
        //to verify token we use jwt
        const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        //get the user to set the user in middleware : decodedToken has _id as we stored in jwt.sign()
        const user = await User.findById(decodedToken?._id).select( "-password", "-refreshToken" );
    
        if(!user) { throw new ApiError(401, "verifyJWT!! invalid access token") }
    
        //user is added in the middleware and is passed the next controller
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "verifyJWT!! invalid access")   
    }

} )

export { verifyJWT };