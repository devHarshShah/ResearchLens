import { connectToDB } from "../../dbconfig/dbconfig";





export default async function handler(req, res) {
    try {
        return res.status(200).json({
            message: 'Login successfull',
          });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Something went wrong3' });
    }
}
