require('dotenv').config();
const express = require('express');

const path = require('path');

const cors = require('cors');

const errorMiddleware = require('./middleware/errorMiddleware');

const connectDB = require('./config/db');



const authRoutes = require('./routes/authRoutes');

const projectRoutes = require('./routes/projectRoutes');

const teamRoutes = require('./routes/teamRoutes');

const categoryEntityRoutes = require('./routes/categoryEntityRoutes');

const paymentRoutes = require('./routes/paymentRoutes');

const dashboardRoutes = require('./routes/dashboardRoutes');

const uploadRoutes = require('./routes/uploadRoutes');



const app = express();



app.use(

  cors({

    origin: true,

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization'],

  })

);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));



// Instant health check — no DB required

app.get('/api/health', (req, res) => {

  res.json({ success: true, message: 'SiteLedger API is running' });

});



// Serverless-friendly DB connect for all other routes

app.use(async (req, res, next) => {

  try {

    await connectDB();

    next();

  } catch (err) {

    next(err);

  }

});



app.use('/api/auth', authRoutes);

app.use('/api/projects', projectRoutes);

app.use('/api/projects', teamRoutes);

app.use('/api/entities', categoryEntityRoutes);

app.use('/api/payments', paymentRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/upload', uploadRoutes);



// Local dev only — when USE_CLOUDINARY=false, serve uploaded files from disk

if (process.env.USE_CLOUDINARY !== 'true') {

  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

}



app.use(errorMiddleware);



module.exports = app;

