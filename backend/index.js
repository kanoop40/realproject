const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const chatRoomRoutes = require('./routes/chatRoomRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// connect MongoDB Atlas
mongoose.connect('mongodb+srv://punchkan2547:et3C4uENs8wqwnpH@cluster0.pco8lhg.mongodb.net/chatapp?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/chatrooms', chatRoomRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.send('ChatApp Backend is running!');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));