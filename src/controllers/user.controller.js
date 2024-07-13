import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async (req, res)=>{
    //***get user details from frontend
    const { username, email, fullName, password } = req.body;

    //****validation - non empty : you can write multiple validation
    // if(fullName === "") { throw new ApiError(400, "fullName is required"); }
    
    //another way to check for all validation all at once
    if( 
        [fullName, email, username, password].some( (field) => field?.trim() === "" ) 
    ) {
        throw new ApiError(400, "All fields are required and compulsary")
    }


    //***check if user already exist: username, email
    //$or : are operators
    const existedUser = await User.findOne( {
        $or: [ { username }, { email } ]
    } )

    if(existedUser) { throw new ApiError(400, "User with username or email already exists") }

    //***check for images, check for avatar
    //files is given by multer
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) { throw new ApiError(400, "Avatar file is required") }


    //**upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) { throw new ApiError(400, "failed to upload avatar on cloundinary") }


    //***create user object - create entry in db
    const newUser = await User.create({
        fullName, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.trim().toLowerCase()
    })

    //check for user creation
    //remover password and refresh token field from response
    //to select what field you do not required
    const createdNewUser = await User.findById(newUser._id).select( "-password -refreshToken" );
    
    if(!createdNewUser) { throw new ApiError(500, "Something went wrong while creating a user") }

    //**return res
    return res.status(201).json(
        new ApiResponse(200, createdNewUser, "User registered successfully"),
    )

} )



//check if registerUser is functioning properly
// const registerUser = asyncHandler( async (req, res) => {
//     res.status(200).json({
//         message: "ok",
//     })
// } )




export { registerUser };