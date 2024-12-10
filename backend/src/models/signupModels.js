import mongoose from "mongoose";
const signupSchema = new mongoose.Schema({
    fullname:{
        type:String,
        require:true,
    },
    email:{
        type:String,
        require:true,
        unique:true,
    },
    password:{
        type:String,
        require:true,
    },
})
const SignupModel = mongoose.model("Signup", signupSchema);
export default SignupModel;