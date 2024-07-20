import mongoose, {Schema, model} from "mongoose";

const playlistSchema = new Schema(
    {
        name
    }, {timestamps: true}
)

export const Playlist = model("Playlist", playlistSchema);