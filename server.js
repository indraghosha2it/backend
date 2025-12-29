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

const Employee = mongoose.model('Employee', employeeSchema);
const OfficeRent = mongoose.model('OfficeRent', officeRentSchema);
const Bill = mongoose.model('Bill', billSchema);

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

app.post('/api/employees', async (req, res) => {
  try {
    console.log('Received employee data:', req.body);
    
    const { name, designation, salary, email, phone } = req.body;
    
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

app.get('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
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

app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid employee ID format' 
      });
    }
    
    const { name, designation, salary, email, phone } = req.body;
    
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

app.get('/api/office-rents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
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

app.post('/api/office-rents', async (req, res) => {
  try {
    console.log('Received office rent data:', req.body);
    
    const { date, rent, status } = req.body;
    
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

app.put('/api/office-rents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid office rent ID format' 
      });
    }
    
    const { date, rent, status } = req.body;
    
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

// Add new bills (multiple) - WITH DUPLICATE PREVENTION
app.post('/api/bills', async (req, res) => {
  try {
    console.log('Received bills data:', req.body);
    
    const billsData = req.body;
    
    if (!Array.isArray(billsData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Expected an array of bills' 
      });
    }
    
    const savedBills = [];
    const errors = [];
    const duplicateBills = [];
    
    // Process bills in sequence to avoid race conditions
    for (const billData of billsData) {
      const { name, amount, date, paymentMethod, isFixed } = billData;
      
      // Skip if amount is empty
      if (!amount || amount === '' || amount === '0') continue;
      
      try {
        // Parse the date
        const billDate = date ? new Date(date) : new Date();
        const month = billDate.getMonth() + 1;
        const year = billDate.getFullYear();
        
        // STRICT DUPLICATE CHECK: Check if bill already exists for this month-year
        const existingBill = await Bill.findOne({
          name: name.trim(),
          month: month,
          year: year
        });
        
        if (existingBill) {
          duplicateBills.push({
            name: name,
            month: month,
            year: year,
            message: `Bill "${name}" already exists for ${billDate.toLocaleString('default', { month: 'long' })} ${year}. Use edit instead.`
          });
          continue;
        }
        
        const bill = new Bill({
          name: name.trim(),
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
          // Duplicate key error from MongoDB unique index
          duplicateBills.push({
            name: name,
            message: `Cannot save: ${name} already exists for this month.`
          });
        } else {
          errors.push({
            name: name,
            message: `Error saving ${name}: ${error.message}`
          });
        }
      }
    }
    
    console.log(`Saved ${savedBills.length} bills, ${duplicateBills.length} duplicates, ${errors.length} errors`);
    
    if (savedBills.length === 0 && duplicateBills.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No bills saved - all are duplicates for this month',
        duplicates: duplicateBills
      });
    }
    
    if (savedBills.length === 0 && errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No bills saved due to errors',
        errors: errors
      });
    }
    
    const response = {
      success: true,
      message: `Saved ${savedBills.length} bill(s) successfully`,
      data: savedBills
    };
    
    if (duplicateBills.length > 0) {
      response.duplicates = duplicateBills;
    }
    
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    res.status(201).json(response);
    
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
    const bills = await Bill.find().sort({ date: -1 });
    
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
      
      if (!groupedByMonth[monthYear].billTypes[bill.name]) {
        groupedByMonth[monthYear].billTypes[bill.name] = 0;
      }
      groupedByMonth[monthYear].billTypes[bill.name] += bill.amount;
    });
    
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

// Get all unique bill types
app.get('/api/bills/types', async (req, res) => {
  try {
    const billTypes = await Bill.distinct('name');
    
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
    
    if (!name || !amount || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, amount, and date are required' 
      });
    }
    
    const billDate = new Date(date);
    const month = billDate.getMonth() + 1;
    const year = billDate.getFullYear();
    
    // Check for duplicate (excluding current bill)
    const existingBill = await Bill.findOne({
      _id: { $ne: id },
      name: name.trim(),
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
      name: name.trim(),
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

// Update multiple bills for a month
app.put('/api/bills/update-month', async (req, res) => {
  try {
    const { monthYear, bills } = req.body;
    
    if (!monthYear || !Array.isArray(bills)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Month-year and bills array are required' 
      });
    }
    
    const [year, month] = monthYear.split('-').map(Number);
    
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
    
    // Track bill names to prevent duplicates in the same request
    const processedNames = new Set();
    
    for (const billData of bills) {
      const { name, amount, date, paymentMethod, _id } = billData;
      
      try {
        // Check for duplicate name in the same request
        if (processedNames.has(name.trim())) {
          results.errors.push({
            name,
            message: `Duplicate bill name "${name}" in the same request`
          });
          continue;
        }
        processedNames.add(name.trim());
        
        // Skip if amount is empty
        if (!amount || amount === '' || amount === '0') {
          continue; // Skip empty bills (they will be deleted)
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
            name: name.trim(),
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
          // Create new bill - check for existing duplicate
          const existingDuplicate = await Bill.findOne({
            name: name.trim(),
            month: month,
            year: year
          });
          
          if (existingDuplicate) {
            results.errors.push({
              name,
              message: `Bill "${name}" already exists for this month`
            });
            continue;
          }
          
          const newBill = new Bill({
            name: name.trim(),
            amount: parseFloat(amount),
            date: date ? new Date(date) : new Date(),
            month: month,
            year: year,
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
    
    // Delete bills that were removed
    const billNamesInRequest = bills.map(b => b.name.trim());
    
    for (const existingBill of existingBills) {
      if (!billNamesInRequest.includes(existingBill.name.trim())) {
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

// Fix duplicate index issue
app.get('/api/fix-index', async (req, res) => {
  try {
    const collection = mongoose.connection.collection('bills');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    // Try to remove problematic index
    try {
      await collection.dropIndex("name_1_month_1_year_1");
      console.log('✅ Duplicate index removed');
      
      // Recreate it with proper settings
      await Bill.createIndexes();
      console.log('✅ Index recreated');
      
    } catch (error) {
      console.log('Index operation:', error.message);
    }
    
    res.json({ 
      success: true, 
      message: "Index cleanup completed",
      indexes: await collection.indexes()
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear all bills (for testing)
app.delete('/api/bills/clear-all', async (req, res) => {
  try {
    const result = await Bill.deleteMany({});
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} bills`,
      data: result
    });
  } catch (error) {
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
  console.log(`🔧 Fix index: http://localhost:${PORT}/api/fix-index`);
  console.log(`🧹 Clear all bills: http://localhost:${PORT}/api/bills/clear-all`);
});