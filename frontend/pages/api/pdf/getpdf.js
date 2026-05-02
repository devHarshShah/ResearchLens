import { connectToDB } from '../../../dbconfig/dbconfig';
import { Pdf } from '../../../models/pdfModel';

export default async function handler(req, res) {
  try {
    await connectToDB();

    const user = await Pdf.findOne({ no: '-1' });
    if (!user || !user.data) {
      return res.status(404).send('No PDF found');
    }

    const pdfData = user.data;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=input.pdf`); // Set desired filename
    res.setHeader('Content-Length', pdfData.length);

    res.status(200).send(pdfData);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
}
