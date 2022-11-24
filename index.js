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
        const userCollection = client.db('thePersonal').collection('userCollection')

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

        //Get User Detail
        app.get('/users', async(req, res) => {
            const query = {};
            const getUser = await userCollection.find(query).toArray()
            res.send(getUser)
        })

        //Get Admin User to Provide Access to Admin Only
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = {email};
            const user = await userCollection.findOne(query)
            res.send({isAdmin: user?.role === 'Admin'})
        })

        //Get Admin User to Provide Access to Admin Only
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = {email};
            const user = await userCollection.findOne(query)
            res.send({isBuyer: user?.role === 'Buyer'})
        })

        //Get Seller User to Provide Access to Admin Only
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = {email};
            const user = await userCollection.findOne(query)
            res.send({isSeller: user?.role === 'Seller'})
        })

        //Store Modal Data Into Database
        app.post('/bookingdata', async(req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        //Store User Data
        app.post('/users', async(req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        //Store New Products
        app.post('/addnewproduct', async(req, res) => {
            const product = req.body;
            const result = await productList.insertOne(product);
            res.send(result)
        })

        //My Orders
        app.get('/myorders', async(req, res) => {
            const query = {};
            const orders = await bookingCollection.find(query).toArray()
            res.send(orders)
        })

        //Find Products By Email for Showing Seller Dashboard
        app.get('/myproducts/:email', async(req, res) => {
            const email = req.params.email;
            const query = {email}
            const orders = await productList.find(query).toArray()
            res.send(orders)
        })

        //Get All Buyers
        app.get('/buyers', async (req, res) => {
            const role = req.params.role;
            const query = {role: 'Buyer'}
            const user = await userCollection.find(query).toArray()
           res.send(user)
        })

        //Get All Sellers
        app.get('/sellers', async (req, res) => {
            const role = req.params.role;
            const query = {role: 'Seller'}
            const user = await userCollection.find(query).toArray()
           res.send(user)
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
