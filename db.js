import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config()

const dbConnect = async() =>{
    try {
        await mongoose.connect(process.env.DB)
        console.log("connected to db")
    }
    catch(err) {
        console.error(err.message)
    }
}

export default dbConnect