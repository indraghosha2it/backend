// const express = require('express');
// const cors = require('cors');
// // require('dotenv').config();
// const { MongoClient, ServerApiVersion } = require('mongodb');


// const PORT = process.env.PORT || 5000;
// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());


// // user name: indraghosha2it_db_user
// // password: lK9eXloK1ehvs32A




// // mongoDB CODE

// const uri = "mongodb+srv://indraghosha2it_db_user:3ZtFZcmwF4pqay9Z@cluster0.2xrkmju.mongodb.net/?appName=Cluster0";

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);


// // Basic route
// app.get('/', (req, res) => {
//   res.json({ message: 'Cost Analysis API is running' });
// });



// // Routes will be added here
// // app.use('/api/expenses', require('./routes/expenseRoutes'));
// // app.use('/api/auth', require('./routes/authRoutes'));

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: 'Something went wrong!' });
// });


// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Atlas Connected Successfully!'))
.catch((err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.log('🔧 Check your MONGODB_URI in .env file');
});

// Employee Schema
const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    required: true,
    trim: true
  },
  salary: {
    type: Number,
    required: true,
    min: 0
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  dateJoined: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const Employee = mongoose.model('Employee', employeeSchema);

// Office Rent Schema
const officeRentSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  rent: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'paid'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const OfficeRent = mongoose.model('OfficeRent', officeRentSchema);

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Backend is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// =============== EMPLOYEE ROUTES ===============

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ dateJoined: -1 });
    res.json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add new employee
app.post('/api/employees', async (req, res) => {
  try {
    console.log('Received employee data:', req.body);
    
    const { name, designation, salary, email, phone } = req.body;
    
    // Validation
    if (!name || !designation || !salary) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, designation, and salary are required' 
      });
    }
    
    const employee = new Employee({
      name,
      designation,
      salary: parseFloat(salary),
      email: email || '',
      phone: phone || ''
    });
    
    await employee.save();
    
    console.log('Employee saved:', employee);
    
    res.status(201).json({
      success: true,
      message: 'Employee added successfully',
      data: employee
    });
  } catch (error) {
    console.error('Error saving employee:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findByIdAndDelete(id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get single employee by ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid employee ID format' 
      });
    }
    
    const employee = await Employee.findById(id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }
    
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid employee ID format' 
      });
    }
    
    const { name, designation, salary, email, phone } = req.body;
    
    // Validation
    if (!name || !designation || !salary) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, designation, and salary are required' 
      });
    }
    
    const updateData = {
      name,
      designation,
      salary: parseFloat(salary),
      email: email || '',
      phone: phone || ''
    };
    
    const employee = await Employee.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// =============== OFFICE RENT ROUTES ===============

// Get all office rents
app.get('/api/office-rents', async (req, res) => {
  try {
    const rents = await OfficeRent.find().sort({ date: -1 });
    res.json({
      success: true,
      count: rents.length,
      data: rents
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get single office rent by ID
app.get('/api/office-rents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid office rent ID format' 
      });
    }
    
    const rent = await OfficeRent.findById(id);
    
    if (!rent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Office rent record not found' 
      });
    }
    
    res.json({
      success: true,
      data: rent
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add new office rent
app.post('/api/office-rents', async (req, res) => {
  try {
    console.log('Received office rent data:', req.body);
    
    const { date, rent, status } = req.body;
    
    // Validation
    if (!date || !rent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date and rent amount are required' 
      });
    }
    
    const officeRent = new OfficeRent({
      date: new Date(date),
      rent: parseFloat(rent),
      status: status || 'paid'
    });
    
    await officeRent.save();
    
    console.log('Office rent saved:', officeRent);
    
    res.status(201).json({
      success: true,
      message: 'Office rent saved successfully',
      data: officeRent
    });
  } catch (error) {
    console.error('Error saving office rent:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update office rent
app.put('/api/office-rents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid office rent ID format' 
      });
    }
    
    const { date, rent, status } = req.body;
    
    // Validation
    if (!date || !rent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date and rent amount are required' 
      });
    }
    
    const updateData = {
      date: new Date(date),
      rent: parseFloat(rent),
      status: status || 'paid',
      updatedAt: Date.now()
    };
    
    const officeRent = await OfficeRent.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!officeRent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Office rent record not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Office rent updated successfully',
      data: officeRent
    });
  } catch (error) {
    console.error('Error updating office rent:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete office rent
app.delete('/api/office-rents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const officeRent = await OfficeRent.findByIdAndDelete(id);
    
    if (!officeRent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Office rent record not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Office rent deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get rent summary - FIXED VERSION
app.get('/api/office-rents/summary', async (req, res) => {
  try {
    console.log('📊 Summary endpoint called');
    
    // Alternative approach without aggregation
    const allRents = await OfficeRent.find();
    
    let totalPaid = 0;
    let totalUnpaid = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    
    allRents.forEach(rent => {
      if (rent.status === 'paid') {
        totalPaid += rent.rent;
        paidCount++;
      } else if (rent.status === 'unpaid') {
        totalUnpaid += rent.rent;
        unpaidCount++;
      }
    });
    
    res.json({
      success: true,
      data: {
        totalPaid: totalPaid,
        totalUnpaid: totalUnpaid,
        totalRecords: allRents.length,
        totalAmount: totalPaid + totalUnpaid,
        paidCount: paidCount,
        unpaidCount: unpaidCount
      }
    });
  } catch (error) {
    console.error('❌ Error in summary:', error);
    
    // Return empty summary on error
    res.json({
      success: true,
      data: {
        totalPaid: 0,
        totalUnpaid: 0,
        totalRecords: 0,
        totalAmount: 0,
        paidCount: 0,
        unpaidCount: 0
      },
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`👥 Employee API: http://localhost:${PORT}/api/employees`);
  console.log(`💰 Office Rent API: http://localhost:${PORT}/api/office-rents`);
});