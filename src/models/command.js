const mongoose = require('mongoose')

const commandSchema = new mongoose.Schema(
    {
        command: String,
        value: String
    }
)

const Command = mongoose.model('Command', commandSchema)

module.exports = Command