const bcryptjs = require("bcryptjs");
import { connectToDB } from "../../../dbconfig/dbconfig.js";


import { User } from "../../../models/userModel";



export default async function handler(req, res) {
    if (req.method === 'POST') {
      try {
        await connectToDB();
  
        const { username, email, password } = req.body;
  
       
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ error: 'User already exists' });
        }
    
  
    
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);
  
        
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
  
        return res.status(200).json({ message: 'Signup successful' });
      } catch (error) {
        console.error('Error during signup:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end('Method Not Allowed');
    }
  }
