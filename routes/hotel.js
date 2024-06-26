const express = require("express");
const hotelController = require("../controller/hotel");

const uploadMiddleware = require("../middleware/uploadFile");

const hotelRouter = express.Router();

hotelRouter.post("/addHotel",
uploadMiddleware.single("file"),
 hotelController.addHotel);
hotelRouter.put("/updateHotel/:id", hotelController.editHotel);
hotelRouter.put("/bookRoom/:id", hotelController.bookRoom);
hotelRouter.get("/getBookedRooms/:id", hotelController.getHotelBookings);
hotelRouter.get("/getAllBooking", hotelController.getAllBookings);
hotelRouter.get("/getHotels", hotelController.getHotels);
hotelRouter.get("/getUnbookedRooms/:id", hotelController.getunBookedRooms);
hotelRouter.get("/search/:value", hotelController.searchHotel);
hotelRouter.get("/booking/search/:name", hotelController.searchBookings);
hotelRouter.delete("/deleteHotel/:id", hotelController.deleteHotel);

module.exports =  hotelRouter;
