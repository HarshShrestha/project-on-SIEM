require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ username: 'admin' });
  console.log("user.id:", user.id);
  console.log("user.username:", user.username);
  process.exit(0);
}
test();
