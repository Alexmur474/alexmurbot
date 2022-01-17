const mongoose = require('mongoose')

const couterSchema = new mongoose.Schema(
    {
        counter: String,
        value: Number
    }
)

const Counter = mongoose.model('Counter', couterSchema)

module.exports = Counter