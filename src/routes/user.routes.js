import { Router} from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 2,  //it will store only one but will not give error
        },
        {
            name: "coverImage",
            maxCount: 1,
        }
    ]),
    registerUser
);
// router.post("/register", registerUser); //same as above


export { router };