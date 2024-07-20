import mongoose, {Schema, model} from "mongoose";

const commentSchema = new Schema(
    {

    }, {timestamps: true}
)

export const Comment = model("Comment", commentSchema);