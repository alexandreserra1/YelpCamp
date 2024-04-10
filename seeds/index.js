const mongoose = require('mongoose');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campground');

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const sample = array => array[Math.floor(Math.random() * array.length)];

const seedDB = async () => {
  await Campground.deleteMany({});
  for (let i = 0; i < 200; i++) {
    const random1000 = Math.floor(Math.random() * 1000);
    const price = Math.floor(Math.random() * 20) + 19;
    const camp = new Campground({
      location: `${cities[random1000].city}, ${cities[random1000].state}`,
      title: `${sample(descriptors)} ${sample(places)}`,
      description: 'This is the best place you ve ever been! It has everything you need to make you connect with nature',
      price,
      geometry: {
        type: "Point",
        coordinates: [
          cities[random1000].longitude,
          cities[random1000].latitude,
        ]
      },
      images: [
        {
          url: 'https://res.cloudinary.com/dboznbktl/image/upload/v1712063965/samples/landscapes/nature-mountains.jpg',
          filename: 'YelpCamp/hidbt3veojxwkemicwo8',
        },
        {
          url: 'https://res.cloudinary.com/dboznbktl/image/upload/v1712273327/YelpCamp/nae646jz3ui5t91cif6x.jpg',
          filename: 'YelpCamp/nae646jz3ui5t91cif6x',
        }
      ],
    });
    await camp.save();
  }
}

seedDB().then(() => {
  mongoose.connection.close();
});
