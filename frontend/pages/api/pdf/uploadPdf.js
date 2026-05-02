// pages/api/upload-pdf.js

import multer from 'multer';
import mongoose from 'mongoose';
import { Pdf } from '../../../models/pdfModel';
import {createRouter} from 'next-connect';
// Initialize Multer
export const config = {
  api: {
      bodyParser: {
          sizeLimit: '10mb' // Set desired value here
      }
  }
}
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fieldSize: 10 * 1024 * 1024 // 10 megabytes in bytes
  } 
});



// Initialize MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define PDF schema


// Create a Next.js API route
const handler1= createRouter();

handler1.use(upload.single('pdf'));

export default async  function handler(req, res){
  try {
    console.log(req);
    if (!req.body) {
      return res.status(400).send('No file uploaded');
    }

    
    // Create a new PDF document
    const pdf = await new Pdf({
      data: req.body,
    });

    // Save the PDF document to MongoDB
    await pdf.save();

    res.status(200).json({ success: true, message: 'PDF uploaded successfully' });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
