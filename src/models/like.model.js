import mongoose, {Schema, model} from "mongoose";

const likeSchema = new Schema(
    {

    }, {timestamps: true}
)

export const Like = model("Like", likeSchema);