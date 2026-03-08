import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
    {
        filename: {
            type:String,
            required:true
        },
        originalName:{
            type:String,
            required:true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        },
        fileSize: {
            type:Number
        },
        mimeType: {
            type:String
        },
        metadata: {
            date: Date,
            location:String,
            latitude: Number,
            longtitude: Number,
            camera: String,
            ISO: Number,
            focalLength: String,
            exposureTime: String,
            width: Number,
            height: Number
        }
    },
    {
        timestamps: true
    }
);
const Image = mongoose.model('Image', imageSchema);
export default Image;