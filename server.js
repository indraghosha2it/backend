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
// Updated Employee Schema with extra fields
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
  // NEW FIELDS
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Cash', 'Check', 'Mobile Banking', 'Credit Card', 'Debit Card', 'Other'],
    default: 'Bank Transfer'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  hireDate: {
    type: Date,
    default: Date.now
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

// =============== BILL/UTILITIES SCHEMA ===============
const billSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Add month and year fields for easier querying
  month: {
    type: Number, // 1-12
    required: true
  },
  year: {
    type: Number, // 2024, 2025, etc.
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'credit_card', 'debit_card', 'online', 'other'],
    default: 'bank_transfer'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'pending'],
    default: 'paid'
  },
  isFixed: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
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

// Add unique compound index to prevent duplicate bills for same month-year
billSchema.index({ name: 1, month: 1, year: 1 }, { unique: true });



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

// Office Supply Schema
const officeSupplySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Mobile Banking', 'Card'],
    required: true
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

officeSupplySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});


// Software Subscription Schema
const softwareSubscriptionSchema = new mongoose.Schema({
  softwareName: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Mobile Banking', 'Card'],
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
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


// Add pre-save middleware
softwareSubscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});



// Add this to your server.js after other schemas

// Transport Expense Schema
const transportExpenseSchema = new mongoose.Schema({
  transportName: {
    type: String,
    required: true,
    trim: true
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Mobile Banking', 'Card'],
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
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


// Add pre-save middleware
transportExpenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});



// Add this to your server.js after other schemas

// Extra Expense Schema
const extraExpenseSchema = new mongoose.Schema({
  expenseName: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Bank Transfer', 'Mobile Banking'],
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
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


// Add pre-save middleware
extraExpenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});


const Employee = mongoose.model('Employee', employeeSchema);
const OfficeRent = mongoose.model('OfficeRent', officeRentSchema);
const Bill = mongoose.model('Bill', billSchema);
const OfficeSupply = mongoose.model('OfficeSupply', officeSupplySchema);
const SoftwareSubscription = mongoose.model('SoftwareSubscription', softwareSubscriptionSchema);
const TransportExpense = mongoose.model('TransportExpense', transportExpenseSchema);
const ExtraExpense = mongoose.model('ExtraExpense', extraExpenseSchema);





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
    
    const { name, designation, salary, email, phone, paymentMethod, notes, hireDate } = req.body;
    
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
      phone: phone || '',
      paymentMethod: paymentMethod || 'Bank Transfer',
      notes: notes || '',
      hireDate: hireDate ? new Date(hireDate) : new Date()
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
    
    const { name, designation, salary, email, phone, paymentMethod, notes, hireDate } = req.body;
    
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
      phone: phone || '',
      paymentMethod: paymentMethod || 'Bank Transfer',
      notes: notes || '',
      hireDate: hireDate ? new Date(hireDate) : new Date()
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
// Get rent summary
// app.get('/api/office-rents/summary', async (req, res) => {
//   try {
//     // Get all rents
//     const allRents = await OfficeRent.find();
    
//     // Calculate totals
//     let totalPaid = 0;
//     let totalUnpaid = 0;
//     let paidCount = 0;
//     let unpaidCount = 0;
    
//     allRents.forEach(rent => {
//       if (rent.status === 'paid') {
//         totalPaid += rent.rent;
//         paidCount++;
//       } else if (rent.status === 'unpaid') {
//         totalUnpaid += rent.rent;
//         unpaidCount++;
//       }
//     });
    
//     res.json({
//       success: true,
//       data: {
//         totalPaid: totalPaid,
//         totalUnpaid: totalUnpaid,
//         totalRecords: allRents.length,
//         totalAmount: totalPaid + totalUnpaid,
//         paidCount: paidCount,
//         unpaidCount: unpaidCount
//       }
//     });
//   } catch (error) {
//     console.error('Error in summary:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: error.message 
//     });
//   }
// });



// =============== BILL ROUTES ===============

// =============== BILL ROUTES ===============

// Get all bills
// =============== BILL ROUTES ===============

// Get all bills
// =============== BILL ROUTES ===============

// Get all bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ date: -1 });
    res.json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get bill by ID
app.get('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bill ID format' 
      });
    }
    
    const bill = await Bill.findById(id);
    
    if (!bill) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bill not found' 
      });
    }
    
    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add new bills (multiple)
// Add new bills (multiple) - UPDATED VERSION
app.post('/api/bills', async (req, res) => {
  try {
    console.log('Received bills data:', req.body);
    
    const billsData = req.body;
    
    // Validate input is an array
    if (!Array.isArray(billsData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expected an array of bills' 
      });
    }
    
    // Process each bill
    const savedBills = [];
    const errors = [];
    
    for (const billData of billsData) {
      const { name, amount, date, paymentMethod, isFixed } = billData;
      
      // Skip if amount is empty
      if (!amount || amount === '' || amount === '0') continue;
      
      // Parse the date
      const billDate = date ? new Date(date) : new Date();
      const month = billDate.getMonth() + 1; // 1-12
      const year = billDate.getFullYear();
      
      try {
        // Check if bill already exists for this month-year
        const existingBill = await Bill.findOne({
          name: name,
          month: month,
          year: year
        });
        
        if (existingBill) {
          errors.push({
            name: name,
            month: month,
            year: year,
            message: `Bill "${name}" for ${billDate.toLocaleString('default', { month: 'long' })} ${year} already exists`
          });
          continue; // Skip this bill
        }
        
        const bill = new Bill({
          name,
          amount: parseFloat(amount),
          date: billDate,
          month: month,
          year: year,
          paymentMethod: paymentMethod || 'bank_transfer',
          isFixed: isFixed || false,
          paymentStatus: 'paid'
        });
        
        await bill.save();
        savedBills.push(bill);
        
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error
          errors.push({
            name: name,
            month: month,
            year: year,
            message: `Cannot save: ${name} for ${billDate.toLocaleString('default', { month: 'long' })} ${year} already exists`
          });
        } else {
          errors.push({
            name: name,
            message: `Error saving ${name}: ${error.message}`
          });
        }
      }
    }
    
    console.log(`Saved ${savedBills.length} bills, ${errors.length} errors`);
    
    if (savedBills.length === 0 && errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No bills saved due to errors',
        errors: errors
      });
    }
    
    res.status(201).json({
      success: true,
      message: `Saved ${savedBills.length} bill(s) successfully`,
      data: savedBills,
      warnings: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error saving bills:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get bills grouped by month
app.get('/api/bills/by-month', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ date: 1 });
    
    // Group bills by month-year
    const billsByMonth = {};
    
    bills.forEach(bill => {
      const date = new Date(bill.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!billsByMonth[monthYear]) {
        billsByMonth[monthYear] = {
          month: monthYear,
          monthName: monthName,
          total: 0,
          bills: [],
          billTypes: {}
        };
      }
      
      billsByMonth[monthYear].total += bill.amount;
      billsByMonth[monthYear].bills.push(bill);
      
      // Group by bill type
      if (!billsByMonth[monthYear].billTypes[bill.name]) {
        billsByMonth[monthYear].billTypes[bill.name] = 0;
      }
      billsByMonth[monthYear].billTypes[bill.name] += bill.amount;
    });
    
    // Convert to array and sort by month
    const result = Object.values(billsByMonth).sort((a, b) => b.month.localeCompare(a.month));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error grouping bills by month:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all unique bill types (for table columns)
app.get('/api/bills/types', async (req, res) => {
  try {
    const billTypes = await Bill.distinct('name');
    res.json({
      success: true,
      data: billTypes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete bill
app.delete('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const bill = await Bill.findByIdAndDelete(id);
    
    if (!bill) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bill not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get total statistics
app.get('/api/bills/stats', async (req, res) => {
  try {
    const bills = await Bill.find();
    
    // Calculate totals
    const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const totalBills = bills.length;
    
    // Count by payment method
    const paymentStats = {};
    bills.forEach(bill => {
      const method = bill.paymentMethod;
      paymentStats[method] = (paymentStats[method] || 0) + 1;
    });
    
    // Count by bill type
    const billTypeStats = {};
    bills.forEach(bill => {
      const type = bill.name;
      billTypeStats[type] = (billTypeStats[type] || 0) + bill.amount;
    });
    
    res.json({
      success: true,
      data: {
        totalAmount,
        totalBills,
        paymentStats,
        billTypeStats,
        avgPerBill: totalBills > 0 ? totalAmount / totalBills : 0
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});






// Get bills grouped by month
// Get bills grouped by month - FIXED VERSION
// Get bills grouped by month - SIMPLIFIED VERSION
app.get('/api/bills/by-month', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ date: -1 });
    
    // Simple grouping
    const groupedByMonth = {};
    
    bills.forEach(bill => {
      const monthYear = `${bill.year}-${String(bill.month).padStart(2, '0')}`;
      const monthName = new Date(bill.year, bill.month - 1).toLocaleString('default', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!groupedByMonth[monthYear]) {
        groupedByMonth[monthYear] = {
          month: monthYear,
          monthName: monthName,
          total: 0,
          bills: [],
          billTypes: {}
        };
      }
      
      groupedByMonth[monthYear].total += bill.amount;
      groupedByMonth[monthYear].bills.push(bill);
      
      // Add to bill types
      if (!groupedByMonth[monthYear].billTypes[bill.name]) {
        groupedByMonth[monthYear].billTypes[bill.name] = 0;
      }
      groupedByMonth[monthYear].billTypes[bill.name] += bill.amount;
    });
    
    // Convert to array and sort
    const result = Object.values(groupedByMonth).sort((a, b) => 
      b.month.localeCompare(a.month)
    );
    
    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('Error in /api/bills/by-month:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all unique bill types (for table columns)
// Get all unique bill types (for table columns) - FIXED VERSION
// Get all unique bill types
app.get('/api/bills/types', async (req, res) => {
  try {
    const billTypes = await Bill.distinct('name');
    
    // If no bills yet, return default types
    if (!billTypes || billTypes.length === 0) {
      return res.json({
        success: true,
        data: ["Electricity Bill", "Water Bill", "Internet Bill", "Gas Bill"]
      });
    }
    
    res.json({
      success: true,
      data: billTypes
    });
  } catch (error) {
    console.error('Error in /api/bills/types:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete bill
app.delete('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const bill = await Bill.findByIdAndDelete(id);
    
    if (!bill) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bill not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get total statistics
// Get total statistics
app.get('/api/bills/stats', async (req, res) => {
  try {
    const bills = await Bill.find();
    
    const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const totalBills = bills.length;
    
    res.json({
      success: true,
      data: {
        totalAmount: totalAmount || 0,
        totalBills: totalBills || 0,
        avgPerBill: totalBills > 0 ? totalAmount / totalBills : 0
      }
    });
  } catch (error) {
    console.error('Error in /api/bills/stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
// =============== EDIT/UPDATE ROUTES ===============

// Get bills by specific month-year
app.get('/api/bills/month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const bills = await Bill.find({
      year: parseInt(year),
      month: parseInt(month)
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      count: bills.length,
      data: bills,
      monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update single bill
app.put('/api/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bill ID format' 
      });
    }
    
    const { name, amount, date, paymentMethod } = req.body;
    
    // Validation
    if (!name || !amount || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, amount, and date are required' 
      });
    }
    
    // Parse date to get month and year
    const billDate = new Date(date);
    const month = billDate.getMonth() + 1;
    const year = billDate.getFullYear();
    
    // Check if another bill with same name exists for this month-year
    const existingBill = await Bill.findOne({
      _id: { $ne: id }, // Exclude current bill
      name: name,
      month: month,
      year: year
    });
    
    if (existingBill) {
      return res.status(400).json({
        success: false,
        message: `A bill with name "${name}" already exists for ${billDate.toLocaleString('default', { month: 'long' })} ${year}`
      });
    }
    
    const updateData = {
      name,
      amount: parseFloat(amount),
      date: billDate,
      month: month,
      year: year,
      paymentMethod: paymentMethod || 'bank_transfer',
      updatedAt: Date.now()
    };
    
    const bill = await Bill.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!bill) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bill not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Bill updated successfully',
      data: bill
    });
  } catch (error) {
    console.error('Error updating bill:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate bill detected for this month'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update multiple bills for a month (for month editing)
app.put('/api/bills/update-month', async (req, res) => {
  try {
    const { monthYear, bills } = req.body;
    
    // Validation
    if (!monthYear || !Array.isArray(bills)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Month-year and bills array are required' 
      });
    }
    
    // Parse monthYear (format: "2024-01")
    const [year, month] = monthYear.split('-').map(Number);
    
    // Get existing bills for this month
    const existingBills = await Bill.find({
      month: month,
      year: year
    });
    
    const results = {
      updated: [],
      created: [],
      deleted: [],
      errors: []
    };
    
    // Process each bill in the update request
    for (const billData of bills) {
      const { name, amount, date, paymentMethod, _id } = billData;
      
      try {
        // Skip if amount is empty
        if (!amount || amount === '' || amount === '0') {
          results.errors.push({
            name,
            message: `Skipped "${name}" - amount is empty`
          });
          continue;
        }
        
        if (_id) {
          // Update existing bill
          const existingBill = existingBills.find(b => b._id.toString() === _id);
          
          if (!existingBill) {
            results.errors.push({
              name,
              message: `Bill with ID ${_id} not found`
            });
            continue;
          }
          
          const updateData = {
            name,
            amount: parseFloat(amount),
            date: date ? new Date(date) : new Date(),
            paymentMethod: paymentMethod || 'bank_transfer',
            updatedAt: Date.now()
          };
          
          const updatedBill = await Bill.findByIdAndUpdate(
            _id,
            updateData,
            { new: true, runValidators: true }
          );
          
          results.updated.push(updatedBill);
          
        } else {
          // Create new bill
          const billDate = date ? new Date(date) : new Date();
          const billMonth = billDate.getMonth() + 1;
          const billYear = billDate.getFullYear();
          
          // Check if bill already exists for this month
          const existingBill = await Bill.findOne({
            name: name,
            month: billMonth,
            year: billYear
          });
          
          if (existingBill) {
            results.errors.push({
              name,
              message: `Bill "${name}" already exists for ${billDate.toLocaleString('default', { month: 'long' })} ${billYear}`
            });
            continue;
          }
          
          const newBill = new Bill({
            name,
            amount: parseFloat(amount),
            date: billDate,
            month: billMonth,
            year: billYear,
            paymentMethod: paymentMethod || 'bank_transfer',
            isFixed: ["Electricity Bill", "Water Bill", "Internet Bill", "Gas Bill"].includes(name)
          });
          
          await newBill.save();
          results.created.push(newBill);
        }
        
      } catch (error) {
        results.errors.push({
          name: billData.name || 'Unknown',
          message: error.message
        });
      }
    }
    
    // Delete bills that were removed (exist in DB but not in update request)
    const billNamesInRequest = bills.map(b => b.name);
    
    for (const existingBill of existingBills) {
      if (!billNamesInRequest.includes(existingBill.name)) {
        await Bill.findByIdAndDelete(existingBill._id);
        results.deleted.push(existingBill);
      }
    }
    
    res.json({
      success: true,
      message: `Month ${monthYear} updated successfully`,
      data: {
        updated: results.updated.length,
        created: results.created.length,
        deleted: results.deleted.length,
        details: results
      }
    });
    
  } catch (error) {
    console.error('Error updating month:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete all bills for a specific month
app.delete('/api/bills/month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const result = await Bill.deleteMany({
      year: parseInt(year),
      month: parseInt(month)
    });
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} bills for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add a pre-save middleware to automatically set month and year
billSchema.pre('save', function(next) {
  if (this.date) {
    const date = new Date(this.date);
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
  }
  this.updatedAt = Date.now();
  next();
});
app.get('/api/fix-index', async (req, res) => {
  try {
    const collection = mongoose.connection.collection('bills');
    await collection.dropIndex("name_1_month_1_year_1");
    res.json({ success: true, message: "Index removed successfully" });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
// Add this route to REMOVE the problematic index
app.get('/api/remove-duplicate-index', async (req, res) => {
  try {
    const collection = mongoose.connection.collection('bills');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    // Remove the problematic index if it exists
    try {
      await collection.dropIndex("name_1_month_1_year_1");
      console.log('✅ Duplicate index removed');
    } catch (error) {
      console.log('Index might not exist or already removed:', error.message);
    }
    
    res.json({ 
      success: true, 
      message: "Index cleanup attempted",
      indexes: indexes 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});



// =============== OFFICE SUPPLY ROUTES ===============

// Get all office supplies
app.get('/api/office-supplies', async (req, res) => {
  try {
    const supplies = await OfficeSupply.find().sort({ date: -1 });
    res.json({
      success: true,
      count: supplies.length,
      data: supplies
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add office supplies (multiple)
app.post('/api/office-supplies', async (req, res) => {
  try {
    console.log('Received office supplies data:', req.body);
    
    const suppliesData = req.body;
    
    // Validate input is an array
    if (!Array.isArray(suppliesData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expected an array of supplies' 
      });
    }
    
    // Process each supply
    const savedSupplies = [];
    const errors = [];
    
    for (const supplyData of suppliesData) {
      const { name, date, price, paymentMethod } = supplyData;
      
      // Skip if required fields are empty
      if (!name || !price || !date) {
        errors.push({
          name: name || 'Unknown',
          message: 'Name, date, and price are required'
        });
        continue;
      }
      
      try {
        const supply = new OfficeSupply({
          name,
          date: new Date(date),
          price: parseFloat(price),
          paymentMethod: paymentMethod
        });
        
        await supply.save();
        savedSupplies.push(supply);
        
      } catch (error) {
        errors.push({
          name: name,
          message: `Error saving "${name}": ${error.message}`
        });
      }
    }
    
    console.log(`Saved ${savedSupplies.length} supplies, ${errors.length} errors`);
    
    res.status(201).json({
      success: true,
      message: `Saved ${savedSupplies.length} supply item(s) successfully`,
      data: savedSupplies,
      warnings: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error saving office supplies:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete a single office supply
app.delete('/api/office-supplies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const supply = await OfficeSupply.findByIdAndDelete(id);
    
    if (!supply) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supply item not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Supply item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get statistics for office supplies
app.get('/api/office-supplies/stats', async (req, res) => {
  try {
    const supplies = await OfficeSupply.find();
    
    const totalAmount = supplies.reduce((sum, supply) => sum + supply.price, 0);
    const totalItems = supplies.length;
    
    // Group by payment method
    const paymentStats = {};
    supplies.forEach(supply => {
      const method = supply.paymentMethod;
      paymentStats[method] = (paymentStats[method] || 0) + supply.price;
    });
    
    // Group by month
    const monthlyStats = {};
    supplies.forEach(supply => {
      const date = new Date(supply.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyStats[monthYear]) {
        monthlyStats[monthYear] = {
          month: monthYear,
          monthName: monthName,
          total: 0,
          count: 0
        };
      }
      
      monthlyStats[monthYear].total += supply.price;
      monthlyStats[monthYear].count += 1;
    });
    
    res.json({
      success: true,
      data: {
        totalAmount,
        totalItems,
        avgPerItem: totalItems > 0 ? totalAmount / totalItems : 0,
        paymentStats,
        monthlyStats: Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month))
      }
    });
  } catch (error) {
    console.error('Error in office supplies stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
// =============== UPDATE OFFICE SUPPLY ROUTE ===============

// Update single office supply
app.put('/api/office-supplies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid supply ID format' 
      });
    }
    
    const { name, date, price, paymentMethod } = req.body;
    
    // Validation
    if (!name || !date || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, date, and price are required' 
      });
    }
    
    const updateData = {
      name,
      date: new Date(date),
      price: parseFloat(price),
      paymentMethod: paymentMethod || 'Cash',
      updatedAt: Date.now()
    };
    
    const supply = await OfficeSupply.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!supply) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supply item not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Supply item updated successfully',
      data: supply
    });
  } catch (error) {
    console.error('Error updating supply:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});



// =============== SOFTWARE SUBSCRIPTION ROUTES ===============

// Get all software subscriptions
app.get('/api/software-subscriptions', async (req, res) => {
  try {
    const subscriptions = await SoftwareSubscription.find().sort({ date: -1 });
    res.json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add software subscriptions (multiple)
app.post('/api/software-subscriptions', async (req, res) => {
  try {
    console.log('Received subscriptions data:', req.body);
    
    const subscriptionsData = req.body;
    
    // Validate input is an array
    if (!Array.isArray(subscriptionsData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expected an array of subscriptions' 
      });
    }
    
    // Process each subscription
    const savedSubscriptions = [];
    const errors = [];
    
    for (const subData of subscriptionsData) {
      const { softwareName, amount, date, paymentMethod, note } = subData;
      
      // Skip if required fields are empty
      if (!softwareName || !amount || !date) {
        errors.push({
          softwareName: softwareName || 'Unknown',
          message: 'Software name, amount, and date are required'
        });
        continue;
      }
      
      try {
        const subscription = new SoftwareSubscription({
          softwareName,
          amount: parseFloat(amount),
          date: new Date(date),
          paymentMethod: paymentMethod || 'Cash',
          note: note || ''
        });
        
        await subscription.save();
        savedSubscriptions.push(subscription);
        console.log(`Saved subscription: ${softwareName}`);
        
      } catch (error) {
        console.error(`Error saving subscription "${softwareName}":`, error);
        errors.push({
          softwareName: softwareName,
          message: `Error saving "${softwareName}": ${error.message}`
        });
      }
    }
    
    console.log(`Saved ${savedSubscriptions.length} subscriptions, ${errors.length} errors`);
    
    res.status(201).json({
      success: true,
      message: `Saved ${savedSubscriptions.length} subscription(s) successfully`,
      data: savedSubscriptions,
      warnings: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error saving subscriptions:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update single subscription
app.put('/api/software-subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating subscription with ID: ${id}`, req.body);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid subscription ID format' 
      });
    }
    
    const { softwareName, amount, date, paymentMethod, note } = req.body;
    
    // Validation
    if (!softwareName || !date || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Software name, date, and amount are required' 
      });
    }
    
    const updateData = {
      softwareName,
      amount: parseFloat(amount),
      date: new Date(date),
      paymentMethod: paymentMethod || 'Cash',
      note: note || '',
      updatedAt: Date.now()
    };
    
    const subscription = await SoftwareSubscription.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subscription not found' 
      });
    }
    
    console.log(`Successfully updated subscription: ${subscription.softwareName}`);
    
    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete single subscription
app.delete('/api/software-subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting subscription with ID: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid subscription ID format' 
      });
    }
    
    const subscription = await SoftwareSubscription.findByIdAndDelete(id);
    
    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subscription not found' 
      });
    }
    
    console.log(`Successfully deleted subscription: ${subscription.softwareName}`);
    
    res.json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get statistics for subscriptions
app.get('/api/software-subscriptions/stats', async (req, res) => {
  try {
    const subscriptions = await SoftwareSubscription.find();
    
    const totalAmount = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
    const totalSubscriptions = subscriptions.length;
    
    // Group by software
    const softwareStats = {};
    subscriptions.forEach(sub => {
      const software = sub.softwareName;
      softwareStats[software] = (softwareStats[software] || 0) + sub.amount;
    });
    
    // Group by month
    const monthlyStats = {};
    subscriptions.forEach(sub => {
      const date = new Date(sub.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyStats[monthYear]) {
        monthlyStats[monthYear] = {
          month: monthYear,
          monthName: monthName,
          total: 0,
          count: 0
        };
      }
      
      monthlyStats[monthYear].total += sub.amount;
      monthlyStats[monthYear].count += 1;
    });
    
    res.json({
      success: true,
      data: {
        totalAmount,
        totalSubscriptions,
        avgPerSubscription: totalSubscriptions > 0 ? totalAmount / totalSubscriptions : 0,
        softwareStats,
        monthlyStats: Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month))
      }
    });
  } catch (error) {
    console.error('Error in subscription stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


// =============== TRANSPORT EXPENSE ROUTES ===============

// Get all transport expenses
app.get('/api/transport-expenses', async (req, res) => {
  try {
    const expenses = await TransportExpense.find().sort({ date: -1 });
    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    console.error('Error fetching transport expenses:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add transport expenses (multiple)
app.post('/api/transport-expenses', async (req, res) => {
  try {
    console.log('Received transport expenses data:', req.body);
    
    const expensesData = req.body;
    
    // Validate input is an array
    if (!Array.isArray(expensesData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expected an array of transport expenses' 
      });
    }
    
    // Process each expense
    const savedExpenses = [];
    const errors = [];
    
    for (const expenseData of expensesData) {
      const { transportName, cost, date, paymentMethod, note } = expenseData;
      
      // Skip if required fields are empty
      if (!transportName || !cost || !date) {
        errors.push({
          transportName: transportName || 'Unknown',
          message: 'Transport name, cost, and date are required'
        });
        continue;
      }
      
      try {
        const expense = new TransportExpense({
          transportName,
          cost: parseFloat(cost),
          date: new Date(date),
          paymentMethod: paymentMethod || 'Cash',
          note: note || ''
        });
        
        await expense.save();
        savedExpenses.push(expense);
        console.log(`Saved transport expense: ${transportName}`);
        
      } catch (error) {
        console.error(`Error saving transport expense "${transportName}":`, error);
        errors.push({
          transportName: transportName,
          message: `Error saving "${transportName}": ${error.message}`
        });
      }
    }
    
    console.log(`Saved ${savedExpenses.length} transport expenses, ${errors.length} errors`);
    
    res.status(201).json({
      success: true,
      message: `Saved ${savedExpenses.length} transport expense(s) successfully`,
      data: savedExpenses,
      warnings: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error saving transport expenses:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update single transport expense
app.put('/api/transport-expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating transport expense with ID: ${id}`, req.body);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid transport expense ID format' 
      });
    }
    
    const { transportName, cost, date, paymentMethod, note } = req.body;
    
    // Validation
    if (!transportName || !date || !cost) {
      return res.status(400).json({ 
        success: false, 
        message: 'Transport name, date, and cost are required' 
      });
    }
    
    const updateData = {
      transportName,
      cost: parseFloat(cost),
      date: new Date(date),
      paymentMethod: paymentMethod || 'Cash',
      note: note || '',
      updatedAt: Date.now()
    };
    
    const expense = await TransportExpense.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transport expense not found' 
      });
    }
    
    console.log(`Successfully updated transport expense: ${expense.transportName}`);
    
    res.json({
      success: true,
      message: 'Transport expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error updating transport expense:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete single transport expense
app.delete('/api/transport-expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting transport expense with ID: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid transport expense ID format' 
      });
    }
    
    const expense = await TransportExpense.findByIdAndDelete(id);
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transport expense not found' 
      });
    }
    
    console.log(`Successfully deleted transport expense: ${expense.transportName}`);
    
    res.json({
      success: true,
      message: 'Transport expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transport expense:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get statistics for transport expenses
app.get('/api/transport-expenses/stats', async (req, res) => {
  try {
    const expenses = await TransportExpense.find();
    
    const totalCost = expenses.reduce((sum, expense) => sum + expense.cost, 0);
    const totalExpenses = expenses.length;
    
    // Group by transport type
    const transportStats = {};
    expenses.forEach(expense => {
      const transport = expense.transportName;
      transportStats[transport] = (transportStats[transport] || 0) + expense.cost;
    });
    
    // Group by month
    const monthlyStats = {};
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyStats[monthYear]) {
        monthlyStats[monthYear] = {
          month: monthYear,
          monthName: monthName,
          total: 0,
          count: 0
        };
      }
      
      monthlyStats[monthYear].total += expense.cost;
      monthlyStats[monthYear].count += 1;
    });
    
    // Group by payment method
    const paymentStats = {};
    expenses.forEach(expense => {
      const method = expense.paymentMethod;
      paymentStats[method] = (paymentStats[method] || 0) + expense.cost;
    });
    
    res.json({
      success: true,
      data: {
        totalCost,
        totalExpenses,
        avgPerExpense: totalExpenses > 0 ? totalCost / totalExpenses : 0,
        transportStats,
        paymentStats,
        monthlyStats: Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month))
      }
    });
  } catch (error) {
    console.error('Error in transport expense stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});




// =============== EXTRA EXPENSE ROUTES ===============

// Get all extra expenses
app.get('/api/extra-expenses', async (req, res) => {
  try {
    const expenses = await ExtraExpense.find().sort({ date: -1 });
    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    console.error('Error fetching extra expenses:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add extra expenses (multiple)
app.post('/api/extra-expenses', async (req, res) => {
  try {
    console.log('Received extra expenses data:', req.body);
    
    const expensesData = req.body;
    
    // Validate input is an array
    if (!Array.isArray(expensesData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expected an array of extra expenses' 
      });
    }
    
    // Process each expense
    const savedExpenses = [];
    const errors = [];
    
    for (const expenseData of expensesData) {
      const { expenseName, amount, date, paymentMethod, note } = expenseData;
      
      // Skip if required fields are empty
      if (!expenseName || !amount || !date) {
        errors.push({
          expenseName: expenseName || 'Unknown',
          message: 'Expense name, amount, and date are required'
        });
        continue;
      }
      
      try {
        const expense = new ExtraExpense({
          expenseName,
          amount: parseFloat(amount),
          date: new Date(date),
          paymentMethod: paymentMethod || 'Cash',
          note: note || ''
        });
        
        await expense.save();
        savedExpenses.push(expense);
        console.log(`Saved extra expense: ${expenseName}`);
        
      } catch (error) {
        console.error(`Error saving extra expense "${expenseName}":`, error);
        errors.push({
          expenseName: expenseName,
          message: `Error saving "${expenseName}": ${error.message}`
        });
      }
    }
    
    console.log(`Saved ${savedExpenses.length} extra expenses, ${errors.length} errors`);
    
    res.status(201).json({
      success: true,
      message: `Saved ${savedExpenses.length} extra expense(s) successfully`,
      data: savedExpenses,
      warnings: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error saving extra expenses:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update single extra expense
app.put('/api/extra-expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating extra expense with ID: ${id}`, req.body);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid extra expense ID format' 
      });
    }
    
    const { expenseName, amount, date, paymentMethod, note } = req.body;
    
    // Validation
    if (!expenseName || !date || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expense name, date, and amount are required' 
      });
    }
    
    const updateData = {
      expenseName,
      amount: parseFloat(amount),
      date: new Date(date),
      paymentMethod: paymentMethod || 'Cash',
      note: note || '',
      updatedAt: Date.now()
    };
    
    const expense = await ExtraExpense.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Extra expense not found' 
      });
    }
    
    console.log(`Successfully updated extra expense: ${expense.expenseName}`);
    
    res.json({
      success: true,
      message: 'Extra expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error updating extra expense:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete single extra expense
app.delete('/api/extra-expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting extra expense with ID: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid extra expense ID format' 
      });
    }
    
    const expense = await ExtraExpense.findByIdAndDelete(id);
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Extra expense not found' 
      });
    }
    
    console.log(`Successfully deleted extra expense: ${expense.expenseName}`);
    
    res.json({
      success: true,
      message: 'Extra expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting extra expense:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get statistics for extra expenses
app.get('/api/extra-expenses/stats', async (req, res) => {
  try {
    const expenses = await ExtraExpense.find();
    
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalExpenses = expenses.length;
    
    // Group by expense type
    const expenseStats = {};
    expenses.forEach(expense => {
      const expenseType = expense.expenseName;
      expenseStats[expenseType] = (expenseStats[expenseType] || 0) + expense.amount;
    });
    
    // Group by month
    const monthlyStats = {};
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyStats[monthYear]) {
        monthlyStats[monthYear] = {
          month: monthYear,
          monthName: monthName,
          total: 0,
          count: 0
        };
      }
      
      monthlyStats[monthYear].total += expense.amount;
      monthlyStats[monthYear].count += 1;
    });
    
    // Group by payment method
    const paymentStats = {};
    expenses.forEach(expense => {
      const method = expense.paymentMethod;
      paymentStats[method] = (paymentStats[method] || 0) + expense.amount;
    });
    
    res.json({
      success: true,
      data: {
        totalAmount,
        totalExpenses,
        avgPerExpense: totalExpenses > 0 ? totalAmount / totalExpenses : 0,
        expenseStats,
        paymentStats,
        monthlyStats: Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month))
      }
    });
  } catch (error) {
    console.error('Error in extra expense stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`👥 Employee API: http://localhost:${PORT}/api/employees`);
  console.log(`💰 Office Rent API: http://localhost:${PORT}/api/office-rents`);
  console.log(`💡 Bills API: http://localhost:${PORT}/api/bills`);

});