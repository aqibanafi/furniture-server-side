const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

//Middle Wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2mjnncj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

//Mongodb Run Function
async function run() {
    try {

        const categoryList = client.db('thePersonal').collection('categoryList');
        const productList = client.db('thePersonal').collection('productsData');
        const bookingCollection = client.db('thePersonal').collection('bookingCollection');
        const userCollection = client.db('thePersonal').collection('userCollection');
        const buyerWishList = client.db('thePersonal').collection('wishList');
        const reportedProduct = client.db('thePersonal').collection('reportedProduct');
        const paymentData = client.db('thePersonal').collection('paymentData');
        const reviewCollection = client.db('thePersonal').collection('reviews')

        // NOTE: make sure you use verifyAdmin after verifyJWT
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);

            if (user?.role !== 'Admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        // NOTE: make sure you use verifyBuyer after verifyJWT
        const verifyBuyer = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);

            if (user?.role !== 'Buyer') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        // NOTE: make sure you use verifySeller after verifyJWT
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);

            if (user?.role !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        //Payment API
        app.post('/create-payment-intent', async (req, res) => {
            const product = req.body;
            const price = parseInt(product.price.price);
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        //Get All category List
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoryList.find(query).toArray()
            res.send(categories);
        })

        //ALL Products API
        app.get('/allproducts', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {}
            const allProducts = await productList.find(query).toArray();
            res.send(allProducts)
        })

        //Get Products Under Specific Category
        app.get('/categories/:name', async (req, res) => {
            const name = req.params.name;
            const query = { category: name };
            const products = await productList.find(query).toArray()
            const soldProduct = products.filter(product => product.status === "Sold")
            const findWishList = products.filter(product => product.productType === "WishList")
            const filterProducts = products.filter(product => !soldProduct.includes(product))
            res.send(filterProducts)
        })

        //Get User Detail
        app.get('/users', verifyJWT, async (req, res) => {
            const query = {};
            const getUser = await userCollection.find(query).toArray()
            res.send(getUser)
        })

        //Get Admin User to Provide Access to Admin Only
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query)
            res.send({ isAdmin: user?.role === 'Admin' })
        })

        //Get Admin User to Provide Access to Admin Only
        app.get('/users/buyer/:email', verifyJWT, verifyBuyer, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query)
            res.send({ isBuyer: user?.role === 'Buyer' })
        })

        //Get Seller User to Provide Access to Seller Only
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query)
            res.send({ isSeller: user?.role === 'Seller' })
        })

        //My Orders
        app.get('/myorders/:email', verifyJWT, verifyBuyer, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const myOrders = await bookingCollection.find(query).toArray();
            res.send(myOrders)
        })

        //Get Advertise Products
        app.get('/advertise', async (req, res) => {
            const query = {};
            const products = await productList.find(query).toArray()
            const advertiseProduct = products.filter(product => product.advertiseStatus === "Advertised")
            const soldProduct = products.filter(product => product.status === "Sold")
            const filterProducts = products.filter(product => advertiseProduct.includes(product))
            const getFinalProduct = filterProducts.filter(product => !soldProduct.includes(product))
            res.send(getFinalProduct)
        })

        //Get Booking for Payment
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const booking = await bookingCollection.findOne(query)
            res.send(booking);
        })

        //Find Products By Email for Showing Seller Dashboard
        app.get('/myproducts/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const orders = await productList.find(query).toArray()
            res.send(orders)
        })

        //Get All Buyers
        app.get('/buyers', verifyJWT, verifyAdmin, async (req, res) => {
            const role = req.params.role;
            const query = { role: 'Buyer' }
            const user = await userCollection.find(query).toArray()
            res.send(user)
        })

        //Get All Sellers
        app.get('/sellers', verifyJWT, verifyAdmin, async (req, res) => {
            const role = req.params.role;
            const query = { role: 'Seller' }
            const user = await userCollection.find(query).toArray()
            res.send(user)
        })

        //Get Single Seller
        app.get('/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const getUser = await userCollection.findOne(query)
            res.send(getUser)
        })

        //Get Wishlist Product to Display Buyer Dashbaord
        app.get('/wishlist/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const wishListProducts = await buyerWishList.find(query).toArray()
            console.log(wishListProducts)
            res.send(wishListProducts)
        })

        //Get Report
        app.get('/reports', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const getReport = await reportedProduct.find(query).toArray();
            res.send(getReport);
        })

        //Get Review
        app.get('/reviews', async (req, res) => {
            const query = {}
            const getReview = await reviewCollection.find(query).toArray()
            res.send(getReview)
        })

        //JWT Token
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
            res.send({ token })
        })

        //Store Modal Data Into Database
        app.post('/bookingdata', verifyJWT, verifyBuyer, async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        //Store User Data
        app.post('/users', async (req, res) => {
            const user = req.body;
            const alreadyExist = await userCollection.findOne({ email: user.email })
            if (!alreadyExist) {
                const users = await userCollection.insertOne(user)
                res.send(users)
            }
        })

        //Store New Products
        app.post('/addnewproduct', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productList.insertOne(product);
            res.send(result);
        })

        //Store Payment Data
        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const result = await paymentData.insertOne(payment);
            res.send(result);
        })

        //Post Review
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review)
            res.send(result);
        })

        //Add to Wish List
        app.put('/addwishlist/:email', verifyJWT, verifyBuyer, async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const wishList = req.body;
            const filter = { _id: ObjectId(id) }
            const email = req.params.email;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    email: email,
                    name: wishList.name,
                    location: wishList.location,
                    resalePrice: wishList.resealablePrice,
                    officialPrice: wishList.originalPrice,
                    yearUse: wishList.yearOfUse,
                    postingTime: wishList.postTime,
                    sellerName: wishList.sellersName,
                    productType: "WishList"
                }
            }
            const alreadyExist = await buyerWishList.findOne({ name: wishList.name })
            if (!alreadyExist) {
                const resultWishList = await buyerWishList.updateOne(filter, updateDoc, options)
                res.send(resultWishList);
            }
        })

        //Edit product
        app.patch('/myproducts/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const product = req.body;
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: product.name,
                    picture: product.picture,
                    location: product.location,
                    resealablePrice: product.resealablePrice,
                    originalPrice: product.originalPrice,
                    yearOfUse: product.yearOfUse,
                    postTime: product.postTime,
                    sellersName: product.sellersName,
                    email: product.email
                }
            }
            console.log(updatedDoc)
            const result = await productList.updateOne(query, updatedDoc)
            res.send(result)
        })

        //Make Sold
        app.patch('/makesold/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const status = req.body;
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: status.status
                }
            }
            const result = await productList.updateOne(query, updatedDoc)
            res.send(result)
        })

        //Make Advertise
        app.patch('/makeadvertise/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const makeAdvertise = req.body;
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    advertiseStatus: makeAdvertise.advertiseStatus
                }
            }
            const result = await productList.updateOne(query, updatedDoc)
            res.send(result)
        })

        //Add Wishlist
        app.patch('/addwishlist/:email', async (req, res) => {
            const email = req.params.email;
            const makewishlist = req.body;
            const query = { email: email }
            const updatedDoc = {
                $set: {
                    wishList: makewishlist.wishListStatus
                }
            }
            const result = await productList.updateOne(query, updatedDoc)
            res.send(result)
        })

        //Make Product Reported
        app.post('/reportedProducts', verifyJWT, verifyBuyer, async (req, res) => {
            const reportProduct = req.body;
            const reported = await reportedProduct.insertOne(reportProduct);
            res.send(reported);
        })

        //Delete Products
        app.delete('/deleteproduct/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await productList.deleteOne(filter)
            res.send(result)
        })

        //User Delete
        app.delete('/deleteuser/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(filter)
            res.send(result)
        })

        //Seller Verify
        app.patch('/sellerverify/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const verifyStatus = req.body;
            const query = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    verify: verifyStatus.verify
                }
            }
            const result = await userCollection.updateOne(query, updateDoc)
            res.send(result);
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
