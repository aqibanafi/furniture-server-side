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

        const categoryList = client.db('thePersonal').collection('categoryList')

        //Get All category List
        app.get('/categories', async(req, res) => {
            const query = {};
            const categories = await categoryList.find(query).toArray()
            res.send(categories);
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
