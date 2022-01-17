const mongoose = require('mongoose')

const db = 'mongodb://localhost:27017/twitchbot'

mongoose
.connect(db, {
    useNewUrlParser: true, 
    useUnifiedTopology:true})
.then((res) => console.log('Connected to DB'))
.catch((error) => console.log(error))