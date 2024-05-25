const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const hotelSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  location: {
    type: String,
    required: true,
  },
  totalRooms: {
    type: Number,
    required: true,
  },
  rooms: [
    {
      customer: {
        type:  mongoose.Schema.ObjectId,
        ref: 'user',
      },
      roomType: {
        type: String,
        required: true,
      },
      roomNumber: {
        type: String,
        required: true,
      },
      isBooked: {
        type: Boolean,
        default: false,
      },
      Booking: {
        from: {
          type: Date,
        },
        to: {
          type: Date,
        },
      },
    },
  ],
});
module.exports = mongoose.model("hotel", hotelSchema, "hotels");
