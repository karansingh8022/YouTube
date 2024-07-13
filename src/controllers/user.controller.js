import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";



const generateAccessAndRefreshToken = async ( userId ) => {
    try {
        //get the user 
        //generate the tokens
        //save the refresh tokens in database
        //return the tokens

        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "loginUser!! generateAccessAndRefreshToken!! Something went wrong while generating access and refresh token")
    }
}




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
    //files is given by multer: first we keep the files on our disk and then store it in cloudinary
    

    //using optional chaining may give you error of cannot read properties of undefined, this is a problem of javascript
    // const avatarLocalPath = req.files?.avatar[0]?.path; //we get an array of avatar therefore avatar[0]
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let avatarLocalPath;
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) 
    avatarLocalPath = req.files.avatar[0].path;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) 
    coverImageLocalPath = req.files.coverImage[0].path;

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
    return res
    .status(201)
    .json( new ApiResponse(200, createdNewUser, "User registered successfully") )

} )




const loginUser = asyncHandler( async (req, res) => {
    //**get data from frontend
    const { username, email, password } = req.body;

    if(!username && !email) { throw new ApiError(400, "loginUser!! username or email is required") }

    //**find the user
    const user = await User.findOne({
        $or: [ { username }, { email } ]
    })

    if(!user) { throw new ApiError(404, "loginUser!! user does not exist") }

    //**verify password: access isPasswordCorrect using user not User of your schema
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) { throw new ApiError(401, "loginUser!! invalid password") }

    //**set access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    //**send cookie
    //you get many unwanted fields too in user so in order to send selected fields to the user
    const loggedInUser = await User.findById(user._id).select( "-password", "-refreshToken" );

    //this is done so the noone can alter cookie from the browser and it can be altered only by server
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json( new ApiResponse(
        200,
        {
            user: loggedInUser, accessToken, refreshToken
        },
        "loginUser!! user logged in successfully",
    ) )

} )



const logoutUser = asyncHandler( async(req, res) => {
    //**get the user
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }
        },
        {
            new: true,
        }
    )


    //clear the cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse(200, {}, "logoutUser!! User logout successfully") )
    
} )





export { registerUser, loginUser, logoutUser };




//check if registerUser is functioning properly
// const registerUser = asyncHandler( async (req, res) => {
//     res.status(200).json({
//         message: "karan singh",
//     })
// } )