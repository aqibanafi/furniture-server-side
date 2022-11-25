app.get('/buyers ', async (req, res) => {
    const role = req.params.role;
    const query = { role: 'Buyer' }
    const user = await userCollection.find(query).toArray()
    res.send(user)
})