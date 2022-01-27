const mongoose = require("mongoose");
const { strategies } = require("passport/lib");
const Schema = mongoose.Schema

const calenderSchema = new Schema({
    title: String,
    description: String,
    date: Date.UTC(),
    time: String,
    duration: Number,
    person: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Calender', calenderSchema)