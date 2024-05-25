const Hotel = require("../models/hotel");
const schedule = require("node-schedule");
const mongoose = require("mongoose");

// book a room
const deleteBooking = async () => {
  try {
    const now = new Date();

    // Find and update rooms where lastBooking.to is less than the current date
    await Hotel.updateMany(
      { "rooms.Booking.to": { $lte: now } },
      { $set: { "rooms.$.isBooked": false } }
    ).catch((err) => {
      console.log(err);
    });
  } catch (error) {
    // Handle any unexpected errors
    console.log(error);
  }
};

// Schedule the job to run daily at midnight
schedule.scheduleJob("0 0 * * *", deleteBooking);

const hotelController = {
  async addHotel(req, res) {
    try {
      console.log("in add hotel", req.body);

      const fileBuffer = req.file ? req.file.filename : null;
      let hotelData = req.body;
      let hotel = new Hotel(hotelData);

      if (fileBuffer != null) {
        hotel.image = fileBuffer;
      }

      const emailExists = await Hotel.findOne({
        email: hotel.email,
        location: hotel.location,
      });

      if (emailExists) {
        return res.status(400).send({
          success: false,
          data: { error: "This hotel already exists" },
        });
      } else {
        let rooms = [];
        let totalRooms = 0;
        if (typeof hotelData.rooms == "string") {
          hotelData.rooms = JSON.parse(hotelData.rooms);
        }
        let currentRoomNumber = 0; // Initialize currentRoomNumber outside the loop
        
        if (Array.isArray(hotelData.rooms)) {
          hotelData.rooms.forEach((val) => {
            let noOfRooms = parseInt(val.noOfRooms);
            totalRooms += noOfRooms;
            for (let i = 0; i < noOfRooms; i++) {
              let room = {
                roomType: val.roomType,
                roomNumber: currentRoomNumber + 1, // Assign the current room number
              };
              rooms.push(room);
              currentRoomNumber++; // Increment the room number
            }
          });
        }

        hotel.rooms = rooms;
        hotel.totalRooms = totalRooms;

        try {
          const registeredhotel = await hotel.save();
          return res.status(200).send({
            success: true,
            data: {
              message: "Hotel added successfully",
              name: registeredhotel.name,
              _id: registeredhotel._id,
            },
          });
        } catch (error) {
          console.log(error);
          return res.status(400).send({
            success: false,
            data: { error: error.message },
          });
        }
      }
    } catch (err) {
      console.log("error", err);
      return res.status(500).send({
        success: false,
        data: { error: "Some Error Occurred" },
      });
    }
  },

  // edit hotel

  async editHotel(req, res) {
    try {
      const id = req.params.id;

      if (!id) {
        return res
          .status(400)
          .send({ success: false, data: { error: "Hotel doesn't exist" } });
      } else {
        let hotel = await Hotel.findOneAndUpdate({ _id: id }, req.body)
          .then((result) => {
            // Changed parameter name from res to result
            return res.status(200).send({
              success: true,
              data: { message: "details updated successfully" },
            });
          })
          .catch((err) => {
            return res
              .status(400)
              .send({ success: false, data: { error: err.message } });
          });
      }
    } catch (error) {
      // Handle any unexpected errors
      res.status(500).send({
        success: false,
        data: { error: "Server Error" },
      });
    }
  },
  // get all hotels
  async getHotels(req, res) {
    try {
      let hotel = await Hotel.find()
        .then((result) => {
          // Changed parameter name from res to result
          let hotels = [];
          result.map((val, ind) => {
            let roomTypes = [];
            let rooms = val.rooms;
            let prev = rooms[0].roomType;
            let number = 1;
            let booked = 0;
            let available = 0;
            rooms.map((val2, ind2) => {
              if (val2.isBooked == false) {
                available++;
              } else {
                booked++;
              }
              if (val2.roomType == prev) {
                number++;
              } else if (val2.roomType != prev) {
                roomTypes.push({ type: prev, number: number });
                number = 0;
              }
              if (ind2 == rooms.length - 1) {
                roomTypes.push({ type: prev, number: number });
                number = 0;
              }
              prev = val2.roomType;
            });
            hotels.push({
              id:val._id,
              name: val.name,
              location: val.location,
              totalRooms: val.totalRooms,
              rooms: roomTypes,
              image: val.image,
              available,
              booked,
            });
          });
          hotels.reverse();
          return res.status(200).send({
            success: true,
            data: { message: "details updated successfully", hotel: hotels },
          });
        })
        .catch((err) => {
          return res
            .status(400)
            .send({ success: false, data: { error: err.message } });
        });
    } catch (error) {
      // Handle any unexpected errors
      res.status(500).send({
        success: false,
        data: { error: "Server Error" },
      });
    }
  },

   // get all bookings
   async getBookings(req, res) {
    try {
      const id = req.params.id
      console.log("id is", id)
      const bookedRooms = await Hotel.aggregate([
        // Match the hotel by its ID
        { $match: { _id: mongoose.Types.ObjectId(id) } },
        // Unwind the rooms array
        { $unwind: '$rooms' },
        // Match rooms where isBooked is true
        { $match: { 'rooms.isBooked': true } },
        // Perform a lookup to join with the user collection
        {
          $lookup: {
            from: 'users',
            localField: 'rooms.customer',
            foreignField: '_id',
            as: 'rooms.customerDetails'
          }
        },
        // Unwind the customerDetails array
        { $unwind: { path: '$rooms.customerDetails', preserveNullAndEmptyArrays: true } },
        // Project the required fields
        {
          $project: {
            name: 1,
            image: 1,
            location: 1,
            totalRooms: 1,
            'rooms.roomType': 1,
            'rooms.roomNumber': 1,
            'rooms.isBooked': 1,
            'rooms.Booking': 1,
            'rooms.customerDetails.name': 1,
            'rooms.customerDetails.image': 1
          }
        },
        // Group back to hotel with filtered rooms
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            image: { $first: '$image' },
            location: { $first: '$location' },
            totalRooms: { $first: '$totalRooms' },
            rooms: { $push: '$rooms' }
          }
        }
      ]);

      if (bookedRooms) {
        if (bookedRooms.length > 0 && bookedRooms[0].rooms.length > 0) {
          return res.status(200).send({
            success: true,
            data: { message: "Rooms Found", rooms: bookedRooms[0].rooms },
          });
        } else {
          return res.status(404).send({
            success: false,
            data: { message: "No booked rooms found", rooms:[] },
          });
        }
      } else {
        return res
          .status(400)
          .send({ success: false, data: { error: err.message } });
      }
    } catch (error) {
      // Handle any unexpected errors
      console.log(error)
      res.status(500).send({
        success: false,
        data: { error: "Server Error" },
      });
    }
  },

   // search hotel
   async searchHotel(req, res) {
    try {
      const value = req.params.value;

          let hotel = await Hotel.find({ 
            $or: [
              { name: new RegExp(value, 'i') },
              { location: new RegExp(value, 'i') },
            ],
           })
            .then((result) => {
               // Changed parameter name from res to result
          let hotels = [];
          result.map((val, ind) => {
            let roomTypes = [];
            let rooms = val.rooms;
            let prev = rooms[0].roomType;
            let number = 1;
            let booked = 0;
            let available = 0;
            rooms.map((val2, ind2) => {
              if (val2.isBooked == false) {
                available++;
              } else {
                booked++;
              }
              if (val2.roomType == prev) {
                number++;
              } else if (val2.roomType != prev) {
                roomTypes.push({ type: prev, number: number });
                number = 0;
              }
              if (ind2 == rooms.length - 1) {
                roomTypes.push({ type: prev, number: number });
                number = 0;
              }
              prev = val2.roomType;
            });
            hotels.push({
              id:val._id,
              name: val.name,
              location: val.location,
              totalRooms: val.totalRooms,
              rooms: roomTypes,
              image: val.image,
              available,
              booked,
            });
          });
          hotels.reverse();
          return res.status(200).send({
            success: true,
            data: { message: "details updated successfully", hotel: hotels },
          });
        })
        .catch((err) => {
          return res
            .status(400)
            .send({ success: false, data: { error: err.message } });
        });
    } catch (error) {
      // Handle any unexpected errors
      res.status(500).send({
        success: false,
        data: { error: "Server Error" },
      });
    }
  },

  // get unbooked rooms
  async getunBookedRooms(req, res) {
    try {
      let id = req.params.id;
      await Hotel.findOne({
        _id: id
      })
        .then((result) => {
          let rooms = []
          result.rooms.map((val, ind) => {
            if(val.isBooked == false){
              rooms.push(val)
            }
          })
          return res.status(200).send({
            success: true,
            data: { message: "rooms found", rooms: rooms},
          });
        })
        .catch((err) => {
          return res
            .status(400)
            .send({ success: false, data: { error: err.message } });
        });
    } catch (error) {
      // Handle any unexpected errors
      res.status(500).send({
        success: false,
        data: { error: "Server Error" },
      });
    }
  },

  // book a room
  async bookRoom(req, res) {
    try {
      const id = req.params.id;
      const { Booking, customer, roomNumber } = req.body;

      if (!id) {
        return res
          .status(400)
          .send({ success: false, data: { error: "Hotel doesn't exist" } });
      } else {
        await Hotel.updateOne(
          { _id: id, "rooms.roomNumber": roomNumber },
          {
            $set: {
              "rooms.$.isBooked": true,
              "rooms.$.Booking": Booking,
              "rooms.$.customer": customer,
            },
          }
        )
          .then((result) => {
            // Changed parameter name from res to result
            return res.status(200).send({
              success: true,
              data: { message: "room booked successfully" },
            });
          })
          .catch((err) => {
            return res
              .status(400)
              .send({ success: false, data: { error: err.message } });
          });
      }
    } catch (error) {
      // Handle any unexpected errors
      res.status(500).send({
        success: false,
        data: { error: "Server Error" },
      });
    }
  },

  // delete hotel
  async deleteHotel(req, res) {
    const _id = req.params.id;
    try {
      let hotel = await Hotel.findOneAndDelete({ _id });
      if (hotel) {
        // Changed parameter name from res to result
        return res.status(200).send({
          success: true,
          data: { message: "Hotel deleted successfully" },
        });
      } else {
        return res
          .status(400)
          .send({ success: false, data: { error: "Hotel not found" } });
      }
    } catch (error) {
      // Handle any unexpected errors
      res.status(500).send({
        success: false,
        data: { error: "Server Error" },
      });
    }
  },
};

module.exports = hotelController;

// router.post("/login", async (req, res) => {
// });
