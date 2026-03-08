import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
console.log('JWT_SECRET in auth route:', process.env.JWT_SECRET);
const router = Router();

router.post('/register',async (req, res, next) => {
    try{
        const {name, email, password} = req.body;
        
        // checking if already exists 
        const existing = await User.findOne({email});
        if(existing) {
            return res.status(409).json({
                success:false,
                error: 'Email already exits'
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name, 
            email,
            password : hashedPassword
        });
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success:true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    }
    catch(err){
        next(err);
    }
});

router.post('/login',async(req,res,next)=>{
    try{
        const {email, password} = req.body;

        // to find user 
        const user = await User.findOne({ email });
        if(!user) {
            return res.status(401).json({
                success:false,
                error:'Invalid credentials'
            });
        }
        const match = await bcrypt.compare(password, user.password);
        if(!match){
            return res.status(401).json({
                success:false,
                error:'Invalid credentials'
            });
        }
        const token = jwt.sign(
            {userId:user._id, email:user.email},
            process.env.JWT_SECRET,
            {expiresIn:process.env.JWT_EXPIRES_IN}
        );

        res.json({
            success:true,
            token,
            user: {id: user._id, name:user.name, email: user.email }
        });
    }
    catch(err){
        next(err);
    }
});

export default router;