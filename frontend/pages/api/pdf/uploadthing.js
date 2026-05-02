import { connectToDB } from "../../../dbconfig/dbconfig";


import { User } from "../../../models/userModel";


export default async function handler(req, res) {
    try {
        await connectToDB();
        const email=req.body.email;
        const user=await User.findOne({email:email});
        
        const r=user.pdf;
        console.log(r);
          console.log(user);
          
            res.status(200).json({message:"done"})
    }catch(error){
        console.log(error);
       return res.status(500).json(error);
    }
    }
