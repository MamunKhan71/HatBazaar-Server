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
        // await client.connect();
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
        const database = client.db("HatBazaar")
        const productCollection = database.collection('products')

        // This will return all the document count when the website first calls
        app.get('/count', async (req, res) => {
            const result = await productCollection.countDocuments()
            res.send({ result })
        })

        // This will return the product according to the pages
        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const result = await productCollection.find().skip(page * size).limit(size).toArray()
            return res.send(result)
        })

        // This will return the filtered products according to the condition
        app.get('/filtered-products', async (req, res) => {
            try {
                const page = parseInt(req.query.page)
                const size = parseInt(req.query.size)
                const { brands = "", maxPrice = "0", categories = "", search = "" } = req.query;
                const brandsArray = brands ? brands.split(",") : [];
                const categoriesArray = categories ? categories.split(",") : [];
                const maxPriceNumber = parseFloat(maxPrice);

                const matchConditions = {
                    ...(brandsArray.length > 0 && { brandName: { $in: brandsArray } }),
                    ...(maxPriceNumber > 0 && { price: { $lte: maxPriceNumber } }),
                    ...(categoriesArray.length > 0 && { category: { $in: categoriesArray } }),
                    ...(search.trim() !== "" && {
                        productName: {
                            $regex: search.trim(),
                            $options: "i",
                        },
                    }),
                };
                const result = await productCollection.aggregate([{ $match: matchConditions }]).skip(page * size).limit(size).toArray();
                const totalDocuments = await productCollection.countDocuments(matchConditions);
                res.send({ result, totalDocuments });

            } catch (error) {
                console.error("Error fetching filtered products:", error);
                res.status(500).send({ error: "Internal Server Error" });
            }
        });
        // This will only return the products and categories in json format!
        app.get('/product-categories-brands', async (req, res) => {
            try {
                const result = await productCollection.aggregate([
                    {
                        $group: {
                            _id: null,
                            uniqueCategories: { $addToSet: "$category" },
                            uniqueBrands: { $addToSet: "$brandName" }
                        }
                    },
                    {
                        $project: {
                            _id: 0, 
                            uniqueCategories: 1,
                            uniqueBrands: 1
                        }
                    }
                ]).toArray();
                const categories = result.length > 0 ? result[0].uniqueCategories : [];
                const brands = result.length > 0 ? result[0].uniqueBrands : [];
                console.log(categories, brands);
                res.send({ categories, brands });
            } catch (error) {
                console.error("Error fetching product categories and brands:", error);
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
