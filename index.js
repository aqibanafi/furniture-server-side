const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

//Middle Wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2mjnncj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//Mongodb Run Function
async function run () {
    try {

        const categoryList = client.db('thePersonal').collection('categoryList');
        const productList = client.db('thePersonal').collection('productsData');
        const bookingCollection = client.db('thePersonal').collection('bookingCollection')

        //Get All category List
        app.get('/categories', async(req, res) => {
            const query = {};
            const categories = await categoryList.find(query).toArray()
            res.send(categories);
        })

        //Get Products Under Specific Category
        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = {category_id: id};
            const products = await productList.find(query).toArray()
            res.send(products);
        })

        //Store Modal Data Into Database
        app.post('/bookingdata', async(req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })
    }
    finally {

    }
}

run()
.catch(error => console.error(error))

app.get('/', (req, res) => {
    res.send("The Personal Server is Running")
})

app.listen(port, () => {
    console.log(`The Personal Server running on ${port}`)
})
