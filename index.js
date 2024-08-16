const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://hatbazaar-2c879.web.app",
        "https://hatbazaar-2c879.firebaseapp.com",
    ]
}))
const port = process.env.PORT || 5000

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.q3zjxg2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        const database = client.db("HatBazaar")
        const productCollection = database.collection('products')

        app.get('/count', async (req, res) => {
            const result = await productCollection.countDocuments()
            res.send({ result })
        })

        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const result = await productCollection.find().skip(page * size).limit(size).toArray()
            return res.send(result)
        })
        app.get('/filtered-products', async (req, res) => {
            try {
                // Destructure query parameters from req.query
                const page = parseInt(req.query.page)
                const size = parseInt(req.query.size)
                const { brands = "", maxPrice = "0", categories = "", search = "" } = req.query;

                // Parse brands and categories into arrays
                const brandsArray = brands ? brands.split(",") : [];
                const categoriesArray = categories ? categories.split(",") : [];

                // Parse maxPrice into a number
                const maxPriceNumber = parseFloat(maxPrice);

                // Construct the aggregation pipeline with proper conditions
                const matchConditions = {
                    // Check for brands condition
                    ...(brandsArray.length > 0 && { brandName: { $in: brandsArray } }),

                    // Check for maxPrice condition
                    ...(maxPriceNumber > 0 && { price: { $lte: maxPriceNumber } }),

                    // Check for categories condition
                    ...(categoriesArray.length > 0 && { category: { $in: categoriesArray } }),

                    // Check for product name search condition
                    ...(search.trim() !== "" && {
                        productName: {
                            $regex: search.trim(),
                            $options: "i", // Case-insensitive search
                        },
                    }),
                };

                // Perform the aggregation query
                const result = await productCollection.aggregate([{ $match: matchConditions }]).skip(page * size).limit(size).toArray();

                // Send the result as the response
                console.log(result);
                res.send(result);

            } catch (error) {
                console.error("Error fetching filtered products:", error);
                res.status(500).send({ error: "Internal Server Error" });
            }
        });


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log("Running....");
})
