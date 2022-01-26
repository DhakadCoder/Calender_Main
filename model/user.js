const mongoose = require('mongoose')
const passportLocalMongoose = require('passport-local-mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    events: [{
        type: Schema.Types.ObjectId,
        ref: 'Calender'
    }]
})

userSchema.plugin(passportLocalMongoose) // imp

module.exports = mongoose.model('User', userSchema)