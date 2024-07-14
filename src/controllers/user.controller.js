import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import Jwt from "jsonwebtoken";
import mongoose from "mongoose";



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
        throw new ApiError(400, "registerUser!!! All fields are required and compulsary")
    }


    //***check if user already exist: username, email
    //$or : are operators
    const existedUser = await User.findOne( {
        $or: [ { username }, { email } ]
    } )

    if(existedUser) { throw new ApiError(400, "registerUser!!! User with username or email already exists") }

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

    if(!avatarLocalPath) { throw new ApiError(400, "registerUser!!! Avatar file is required") }


    //**upload them to cloudinary, avatar
    let avatar;
    if(avatarLocalPath)
    avatar = await uploadOnCloudinary(avatarLocalPath);

    let coverImage;
    if(coverImageLocalPath)
    coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // console.log(avatar);
    if(!avatar) { throw new ApiError(400, "registerUser!!! failed to upload avatar on cloundinary") }


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
    
    if(!createdNewUser) { throw new ApiError(500, "registerUser!!! Something went wrong while creating a user") }

    //**return res
    return res
    .status(201)
    .json( new ApiResponse(200, createdNewUser, "registerUser!!! User registered successfully") )

} )




const loginUser = asyncHandler( async (req, res) => {
    //**get data from frontend
    const { username, email, password } = req.body;

    
    if(!username && !email) 
    { throw new ApiError(400, "loginUser!! username or email is required") }

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
    const loggedInUser = await User.findById(user._id).select( "-password -refreshToken" );

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




const refreshAccessToken = asyncHandler( async (req, res) => {
    //**take the token from cookie or body */
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) { throw new ApiError(401, "refreshAccessToken!!! unauthorized request") }

    try {
        //**verify the authorization */
        const decodedToken = Jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id);
    
        if(!user){ throw new ApiError(401, "refreshAccessToken!!! invalid access token") }
    
        if(incomingRefreshToken !== user?.refreshToken) { throw new ApiError(401, "refreshAccessToken!!! unauthorized access") }
        
        //**generate the new token */
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    
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
                accessToken, refreshToken
            },
            "refreshAccessToken!! access token refreshed",
        ) ) 
    } catch (error) {
        throw new ApiError(401, "refreshAccessToken!!! refresh token expired or used");
    }

} )





const changeCurrentPassword = asyncHandler( async(req, res) => {
    //**get the old and new password
    const { oldPassword, newPassword } = req.body;

    //we will be needing user and verify whether the user is logged in and he is changing the password which can ve done by verifyJWT
    //**get the user from middleware
    const user = await User.findById(req.user?._id);

    if(!user) { throw new ApiError(401, "changeCurrentPassword!!! user not authorized") }

    //**verify the password
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect) { throw new ApiError(401, "changeCurrentPassword!!! password is incorrect") }

    //**update the password */
    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json( new ApiResponse(200, {}, "changeCurrentPassword!!! Password is successfully changed") )

} )




const getCurrentUser = asyncHandler( async(req, res) => {
    //we will user middleware to get the user verifyJWT
    return res
    .status(200)
    .json( new ApiResponse(200, req.user, "getCurrentUser!!! current user fetched successfully") )
} )




const updateAccountDetails = asyncHandler( async (req, res) => {
    //verify using middleware that user is authorized for the change or not
    const { fullName, email } = req.body;

    if(!fullName || !email) { throw new ApiError(400, "updateAccountDetails!!! all the fields are required") }

    //you can user req.user.fullName = fullName: user.save() as well but as here we have multiple value so we did this way
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email, //if both field have same name they can be updated this way as well
            }
        },
        { new: true } //this is done to return the updated value
    ).select(" -password -refreshToken ") 
    
    return res
    .status(200)
    .json( new ApiResponse(200, user, "updateAccountDetails!!! Account details updated successfully") )
} )



const updateUserAvatar = asyncHandler( async (req, res) => {
    //we will be using multer middleware to update files and verifyJWT to verify the user
    
    // console.log(req.file);
    //**get the path: we have used upload.single in the middleware that is why here we get file only */
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath) { throw new ApiError(401, "updateUserAvatar!!! file path is not found") }

    //**upload on cloudinary */
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url) { throw new ApiError(401, "updateUserAvatar!!! failed to upload avatar") }

    //**update the user */
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        { new: true }
    ).select(" -password -refreshToken ")

    return res
    .status(200)
    .json( new ApiResponse(200, user, "updateUserAvatar!!! Avatar updated successfully") )
    
} )



const updateUserCoverImage = asyncHandler( async (req, res) => {
    //we will be using multer middleware to update files and verifyJWT to verify the user
    
    // console.log(req.file);
    //**get the path */
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath) { throw new ApiError(401, "updateUserCoverImage!!! file path is not found") }

    //**upload on cloudinary */
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url) { throw new ApiError(401, "updateUserCoverImage!!! failed to upload Cover Image") }

    //**update the user */
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            }
        },
        { new: true }
    ).select(" -password -refreshToken ")

    return res
    .status(200)
    .json( new ApiResponse(200, user, "updateUserCoverImage!!! Cover Image updated successfully") )
    
} )




const getUserChannelProfile = asyncHandler( async (req, res) => {
    //**take the username from route */
    const { username } = req.params;

    if(!username?.trim()) { throw new ApiError(400, "getUserChannelProfile!! username is missing") }

    //**apply aggragation pipeline  */
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            //to get all the subscribers
            $lookup: {
                from: "subscriptions", //take the model from where you want to lookup, take the name how it is stored in mongodb
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            //to get all the channels to whom we have subscribed to
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedTo: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {//checking if the user is subscribed or not to display the subscribe button
                    $cond: {
                        if: { $in: [ req.user?._id, "$subscribers.subscriber" ] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            //the data you want to display or give the selected fields
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                subscriberCount: 1,
                channelsSubscribedTo: 1,
                avatar: 1,
                coverImage: 1,
                isSubscribed: 1
            }
        }
    ])


    // console.log(channel);

    if(!channel?.length){ throw new ApiError(401, "getUserChannelProfile!!! Channel does not exists") }

    return res
    .status(200)
    .json( new ApiResponse(200, channel[0], "getUserChannelProfile!!! user channel fetched successfully"))
} )



const getUserWatchHistory = asyncHandler( async (req, res) => {
    //you take user
    //you take the watchHistory
    //you go to the videos
    //now you go to the owner to the owner of the videos
    //now you again to the user from the owner to get the user detail of the owner
    //you modify the details of the user that you want to keep in the owner
    //you modify the owner field how it give output to the fronted 

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        //you are now in vedios schema and you are trying to get the owner of the vedio which is in user
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [ 
                                {
                                    //you are getting many fields of the user and you decide what you want to keep in the owner
                                    $project: {
                                        username: 1,
                                        avatar: 1,
                                        fullName: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        //after this you will get owner which is an array and in its 0th element you will all the data so we can modify if for the frontend person
                        $addFields: {
                            //override the owner field
                            owner: {
                                $first: "$owner",
                            }
                        }
                    }
                ]
            }
        },
        
    ])


    if(!user?.length) { new ApiError(401, "getUserWatchHistory!!! WatchHistory cannot be found") }

    return res
    .status(200)
    .json( new ApiResponse(
        200, 
        user[0].watchHistory,
        "getUserWatchHistory!!! watchHistory fetched successfully"
    ))
} )


export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
};




//check if registerUser is functioning properly
// const registerUser = asyncHandler( async (req, res) => {
//     res.status(200).json({
//         message: "karan singh",
//     })
// } )



//NOTE: read about aggregation pipelines