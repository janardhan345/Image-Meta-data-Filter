import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name:{
            type:String,
            required:[true, 'Name is required'],
            trim: true,
            minlength:[2, 'Name must be at least 2 characters']
        },
        email:{
            type:String,
            required:[true, 'Email is required'],
            unique:true,
            lowercase:true,
            trim:true,
            match:[/^\S+@\S+\.\S+$/, 'please enter valid email']
        },
        password:{
            type:String,
            required:[true, 'password is required'],
            minlength:[8, 'password must be at least 8 characters']
        }
    },
    {
        timestamps:true
    }
);
const User = mongoose.model('User',userSchema);
export default User;