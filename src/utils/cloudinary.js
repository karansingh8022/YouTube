import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; //this is the file system given by the node 

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        //uploading file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })

        // console.log(`file is uploaded on cloudinary: ${response}`);
        fs.unlinkSync(localFilePath); //if same file is uploaded in avatar and coverImage then in local it is saved only once and it get unlink first for avatar and give error for coverImage therefor please upload different image
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath); //this will remove the temporary file stored as the upload got failed
        return null;
    }
}


export { uploadOnCloudinary };

//NOTE: read about node fs