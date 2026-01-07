

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
// const corsOptions = {
//   origin: 'http://localhost:3002', // or use an array for multiple origins
//   credentials: true, // This is important!
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// };
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};



// Middleware
// app.use(cors({
//   origin: '*', // Your Next.js frontend
//   credentials: true // Allow cookies
// }));
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// JWT Secret - Add to your .env file
const JWT_SECRET = process.env.JWT_SECRET;

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



// =============== USER SCHEMA &  ===============

// Add this after your other schemas, before routes
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'user'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// =============== AUTH MIDDLEWARE ===============

// Middleware to verify JWT token and check roles
const requireAuth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Get token from cookies or Authorization header
      const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Find user in database to verify they still exist and get role
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Check if user's role is in allowedRoles
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions' 
        });
      }
      
      // Attach user to request object
      req.user = user;
      next();
      
    } catch (error) {
      console.error('Auth middleware error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expired' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  };
};

// =============== AUTH ROUTES ===============

// User registration (admin only)
app.post('/api/auth/register', requireAuth(['admin']), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'user'
    });
    
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: userResponse
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Remove password from user object
    const userResponse = user.toObject();
    delete userResponse.password;
    
    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: userResponse,
      token // Also send token in response for client-side storage
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get current user info
app.get('/api/auth/me', requireAuth([]), async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  // Clear the auth cookie
  res.clearCookie('auth_token', {
    path: '/'
  });
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});



// Employee Schema
// Updated Employee Schema with extra fields
// Updated Employee Schema with extra fields - NO UNIQUE CONSTRAINT
// Update your employee schema - Remove virtuals that cause indexing issues
// Updated Employee Schema with salaryMonth and salaryYear
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
  workingDays: {
    type: Number,
    required: true,
    default: 26,
    min: 20,
    max: 31
  },
  absentDays: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
   // Add new fields
  maidFee: {
    type: Number,
    default: 500,
    min: 0
  },
  foodCost: {
    type: Number,
    default: 0,
    min: 0
  },
  calculatedSalary: {
    type: Number,
    default: 0
  },
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
  salaryDate: {
    type: Date,
    required: true, 
    default: Date.now
  },
  // Add these fields
  salaryMonth: {
    type: Number,
    required: true
  },
  salaryYear: {
    type: Number,
    required: true
  },
  dateJoined: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  toObject: { virtuals: false },
  toJSON: { virtuals: false }
});

// Add unique compound index
employeeSchema.index({ name: 1, salaryMonth: 1, salaryYear: 1 }, { 
  unique: true,
  name: 'employee_monthly_salary_unique'
});

// Updated pre-save middleware
employeeSchema.pre('save', function(next) {
  // Extract month and year from salaryDate
  if (this.salaryDate) {
    const date = new Date(this.salaryDate);
    this.salaryMonth = date.getMonth() + 1; // 1-12
    this.salaryYear = date.getFullYear();
  }
  
  // Calculate salary with maidFee and foodCost deductions
  if (this.salary && this.workingDays && this.absentDays !== undefined) {
    const perDaySalary = this.salary / this.workingDays;
    const absenceDeduction = perDaySalary * this.absentDays;
    const otherDeductions = (this.maidFee || 0) + (this.foodCost || 0);
    const totalDeductions = absenceDeduction + otherDeductions;
    this.calculatedSalary = Math.max(0, this.salary - totalDeductions);
  } else {
    this.calculatedSalary = this.salary || 0;
  }
  
  next();
});

// Update pre-update middleware for findByIdAndUpdate
employeeSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  if (update.salaryDate) {
    const date = new Date(update.salaryDate);
    update.salaryMonth = date.getMonth() + 1;
    update.salaryYear = date.getFullYear();
  }
  
  // If salary is being updated, recalculate with maidFee and foodCost
  if (update.salary !== undefined || update.workingDays !== undefined || 
      update.absentDays !== undefined || update.maidFee !== undefined || 
      update.foodCost !== undefined) {
    
    const salary = update.salary || this._update.salary;
    const workingDays = update.workingDays || this._update.workingDays;
    const absentDays = update.absentDays || this._update.absentDays;
    const maidFee = update.maidFee || this._update.maidFee || 500;
    const foodCost = update.foodCost || this._update.foodCost || 0;
    
    if (salary && workingDays && absentDays !== undefined) {
      const perDaySalary = salary / workingDays;
      const absenceDeduction = perDaySalary * absentDays;
      const otherDeductions = maidFee + foodCost;
      const totalDeductions = absenceDeduction + otherDeductions;
      update.calculatedSalary = Math.max(0, salary - totalDeductions);
    }
  }
  
  next();
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
paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'credit_card', 'debit_card', 'online', 'other'],
    default: 'cash'
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
officeRentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
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

officeSupplySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});


// Software Subscription Schema
// Software Subscription Schema - UPDATED with duration fields
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
  // Add duration fields
  durationNumber: {
    type: Number,
    min: 0,
    default: null
  },
  durationUnit: {
    type: String,
    enum: ['day', 'week', 'month', 'year', null],
    default: null
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


// =============== FOOD COST SCHEMA ===============
const foodCostSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true, // This ensures only one entry per date
    index: true
  },
  cost: {
    type: Number,
    required: true,
    min: 0
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
foodCostSchema.pre('save', function(next) {
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
const FoodCost = mongoose.model('FoodCost', foodCostSchema);





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
app.get('/api/employees', requireAuth(['admin']), async (req, res) => {
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
// Add new employee - UPDATED VERSION
// Add new employee - With detailed error logging
// Add new employee - FIXED VERSION with maidFee and foodCost
app.post('/api/employees',requireAuth(['admin']), async (req, res) => {
  try {
    console.log('Received employee data:', req.body);
    
    const { name, designation, salary, workingDays, absentDays, 
            maidFee, foodCost, paymentMethod, notes, salaryDate } = req.body;
    
    // Validation
    if (!name || !designation || !salary || !salaryDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, designation, salary, and salary date are required' 
      });
    }
    
    // Parse the salary date to get month and year
    const salaryDateObj = new Date(salaryDate);
    const salaryMonth = salaryDateObj.getMonth() + 1; // 1-12
    const salaryYear = salaryDateObj.getFullYear();
    
    console.log('Checking for duplicate:', { name, salaryMonth, salaryYear });
    
    // Check if employee already has salary for this month-year
    const existingEmployee = await Employee.findOne({
      name: name,
      salaryMonth: salaryMonth,
      salaryYear: salaryYear
    });
    
    if (existingEmployee) {
      const monthName = salaryDateObj.toLocaleString('default', { month: 'long' });
      return res.status(400).json({
        success: false,
        message: `Employee "${name}" already has salary data for ${monthName} ${salaryYear}. Please update the existing entry instead.`,
        existingData: existingEmployee
      });
    }
    
    const employee = new Employee({
      name,
      designation,
      salary: parseFloat(salary),
      workingDays: parseInt(workingDays) || 26,
      absentDays: parseInt(absentDays) || 0,
      maidFee: parseFloat(maidFee) || 500, // Add maidFee
      foodCost: parseFloat(foodCost) || 0, // Add foodCost
      paymentMethod: paymentMethod || 'Bank Transfer',
      notes: notes || '',
      salaryDate: salaryDateObj,
      // These will also be set by pre-save middleware, but set them here too
      salaryMonth: salaryMonth,
      salaryYear: salaryYear
    });
    
    await employee.save();
    
    console.log('Employee saved:', employee);
    
    res.status(201).json({
      success: true,
      message: 'Employee salary added successfully',
      data: employee
    });
  } catch (error) {
    console.error('Error saving employee:', error);
    
    // Handle duplicate key error (unique constraint violation)
    if (error.code === 11000) {
      const monthName = new Date(req.body.salaryDate).toLocaleString('default', { month: 'long' });
      const year = new Date(req.body.salaryDate).getFullYear();
      
      return res.status(400).json({
        success: false,
        message: `Employee "${req.body.name}" already has salary data for ${monthName} ${year}. Please update the existing entry instead.`
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// =============== DEBUGGING ROUTES ===============



// 4. Quick fix: Temporary POST route that works around the index
app.post('/api/employees-temp-fix', requireAuth(['admin']), async (req, res) => {
  try {
    console.log('🔧 Using temporary fix route');
    
    const { name, designation, salary, workingDays, absentDays, paymentMethod, notes, salaryDate } = req.body;
    
    if (!name || !designation || !salary) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, designation, and salary are required' 
      });
    }
    
    // Use direct MongoDB insertion to bypass Mongoose
    const collection = mongoose.connection.collection('employees');
    
    const employeeData = {
      name,
      designation,
      salary: parseFloat(salary),
      workingDays: parseInt(workingDays) || 26,
      absentDays: parseInt(absentDays) || 0,
      paymentMethod: paymentMethod || 'Bank Transfer',
      notes: notes || '',
      salaryDate: salaryDate ? new Date(salaryDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📝 Inserting directly to MongoDB:', employeeData);
    
    const result = await collection.insertOne(employeeData);
    
    console.log('✅ Insert successful, ID:', result.insertedId);
    
    res.status(201).json({
      success: true,
      message: 'Employee added successfully (using direct insert)',
      data: { ...employeeData, _id: result.insertedId }
    });
  } catch (error) {
    console.error('❌ Direct insert error:', error);
    
    if (error.code === 11000) {
      // Even direct insert failed, the index definitely exists
      return res.status(400).json({
        success: false,
        message: 'STILL getting duplicate error! The index must be manually removed.',
        error: error.message,
        suggestion: 'Visit /api/drop-employee-unique-index to remove the index'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
// Delete employee
app.delete('/api/employees/:id', requireAuth(['admin']), async (req, res) => {
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
app.get('/api/employees/:id', requireAuth(['admin']), async (req, res) => {
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
// Update employee - UPDATED VERSION
// Update employee - UPDATED
// Update employee - UPDATED with maidFee and foodCost
app.put('/api/employees/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid employee ID format' 
      });
    }
    
    const { name, designation, salary, workingDays, absentDays, 
            maidFee, foodCost, paymentMethod, notes, salaryDate } = req.body;
    
    // Validation
    if (!name || !designation || !salary || !salaryDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, designation, salary, and salary date are required' 
      });
    }
    
    // Parse the salary date to get month and year
    const salaryDateObj = new Date(salaryDate);
    const salaryMonth = salaryDateObj.getMonth() + 1;
    const salaryYear = salaryDateObj.getFullYear();
    
    // Check if another employee with same name has salary for this month-year
    const existingEmployee = await Employee.findOne({
      _id: { $ne: id }, // Exclude current employee
      name: name,
      salaryMonth: salaryMonth,
      salaryYear: salaryYear
    });
    
    if (existingEmployee) {
      const monthName = salaryDateObj.toLocaleString('default', { month: 'long' });
      return res.status(400).json({
        success: false,
        message: `Another entry for "${name}" already exists for ${monthName} ${salaryYear}.`
      });
    }
    
    const updateData = {
      name,
      designation,
      salary: parseFloat(salary),
      workingDays: parseInt(workingDays) || 26,
      absentDays: parseInt(absentDays) || 0,
      maidFee: parseFloat(maidFee) || 500, // Add maidFee
      foodCost: parseFloat(foodCost) || 0, // Add foodCost
      paymentMethod: paymentMethod || 'Bank Transfer',
      notes: notes || '',
      salaryDate: salaryDateObj
      // salaryMonth and salaryYear will be updated by pre-save middleware
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
      message: 'Employee salary updated successfully',
      data: employee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const monthName = new Date(req.body.salaryDate).toLocaleString('default', { month: 'long' });
      const year = new Date(req.body.salaryDate).getFullYear();
      
      return res.status(400).json({
        success: false,
        message: `Cannot update: Another entry for "${req.body.name}" already exists for ${monthName} ${year}.`
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check if employee already has salary for a specific month
// Check if employee already has salary for a specific month - FIXED VERSION
app.get('/api/employees/check-duplicate', requireAuth(['admin']), async (req, res) => {
  try {
    const { name, salaryDate } = req.query;
    
    console.log('Checking duplicate for:', { name, salaryDate });
    
    if (!name || !salaryDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and salaryDate query parameters are required' 
      });
    }
    
    // Parse the date to get month and year
    const date = new Date(salaryDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid salaryDate format' 
      });
    }
    
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    console.log('Looking for:', { name, month, year });
    
    const existingEmployee = await Employee.findOne({
      name: name,
      salaryMonth: month,
      salaryYear: year
    });
    
    if (existingEmployee) {
      const monthName = date.toLocaleString('default', { month: 'long' });
      return res.json({
        success: true,
        exists: true,
        message: `Employee "${name}" already has salary data for ${monthName} ${year}`,
        data: existingEmployee
      });
    }
    
    res.json({
      success: true,
      exists: false,
      message: 'No duplicate found'
    });
  } catch (error) {
    console.error('Error checking duplicate:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
// Add this route to migrate existing data
// Migration route for existing data
app.get('/api/migrate-employees-fix', requireAuth(['admin']), async (req, res) => {
  try {
    const employees = await Employee.find({ 
      $or: [
        { salaryMonth: { $exists: false } },
        { salaryYear: { $exists: false } }
      ]
    });
    
    let updatedCount = 0;
    let errors = [];
    
    for (const employee of employees) {
      try {
        const date = new Date(employee.salaryDate);
        employee.salaryMonth = date.getMonth() + 1;
        employee.salaryYear = date.getFullYear();
        await employee.save();
        updatedCount++;
        console.log(`Updated employee: ${employee.name} - ${employee.salaryMonth}/${employee.salaryYear}`);
      } catch (error) {
        errors.push({ employee: employee.name, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `Updated ${updatedCount} employees with month/year fields`,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// // Migration route to add maidFee and foodCost to existing employees
// app.post('/api/migrate-employee-fields', requireAuth(['admin']), async (req, res) => {
//   try {
//     // Add maidFee and foodCost fields to all existing employees
//     const result = await Employee.updateMany(
//       {
//         $or: [
//           { maidFee: { $exists: false } },
//           { foodCost: { $exists: false } }
//         ]
//       },
//       {
//         $set: {
//           maidFee: 500,
//           foodCost: 0
//         }
//       }
//     );
    
//     res.json({
//       success: true,
//       message: `Updated ${result.modifiedCount} employees with maidFee and foodCost fields`,
//       data: result
//     });
//   } catch (error) {
//     console.error('Migration error:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: error.message 
//     });
//   }
// });

// =============== OFFICE RENT ROUTES ===============

// Get all office rents
app.get('/api/office-rents', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/office-rents/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
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
// Update POST /api/office-rents route
app.post('/api/office-rents', requireAuth(['admin', 'moderator']), async (req, res) => {
  try {
    console.log('Received office rent data:', req.body);
    
    const { date, rent, paymentMethod, note } = req.body;
    
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
      paymentMethod: paymentMethod || 'cash',
      note: note || ''
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
// Update PUT /api/office-rents/:id route
app.put('/api/office-rents/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid office rent ID format' 
      });
    }
    
    const { date, rent, paymentMethod, note } = req.body;
    
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
      paymentMethod: paymentMethod || 'cash',
      note: note || '',
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
app.delete('/api/office-rents/:id',  requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/bills', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/bills/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.post('/api/bills', requireAuth(['admin', 'moderator']), async (req, res) => {
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
      const { name, amount, date, paymentMethod, isFixed, note } = billData;
      
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
           note: note || '',
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
// app.get('/api/bills/by-month', requireAuth(['admin', 'moderator']), async (req, res) => {
//   try {
//     const bills = await Bill.find().sort({ date: 1 });
    
//     // Group bills by month-year
//     const billsByMonth = {};
    
//     bills.forEach(bill => {
//       const date = new Date(bill.date);
//       const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
//       const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
//       if (!billsByMonth[monthYear]) {
//         billsByMonth[monthYear] = {
//           month: monthYear,
//           monthName: monthName,
//           total: 0,
//           bills: [],
//           billTypes: {}
//         };
//       }
      
//       billsByMonth[monthYear].total += bill.amount;
//       billsByMonth[monthYear].bills.push(bill);
      
//       // Group by bill type
//       if (!billsByMonth[monthYear].billTypes[bill.name]) {
//         billsByMonth[monthYear].billTypes[bill.name] = 0;
//       }
//       billsByMonth[monthYear].billTypes[bill.name] += bill.amount;
//     });
    
//     // Convert to array and sort by month
//     const result = Object.values(billsByMonth).sort((a, b) => b.month.localeCompare(a.month));
    
//     res.json({
//       success: true,
//       data: result
//     });
//   } catch (error) {
//     console.error('Error grouping bills by month:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: error.message 
//     });
//   }
// });

// Get all unique bill types (for table columns)
app.get('/api/bills/types', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.delete('/api/bills/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/bills/stats', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/bills/by-month', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/bills/types', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.delete('/api/bills/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/bills/stats', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/bills/month/:year/:month', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.put('/api/bills/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bill ID format' 
      });
    }
    
    const { name, amount, date, paymentMethod , note} = req.body;
    
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
       note: note || '',
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

// Update multiple bills for a month (for month editing) - UPDATED with note field
app.put('/api/bills/update-month', requireAuth(['admin', 'moderator']), async (req, res) => {
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
      const { name, amount, date, paymentMethod, note, _id } = billData; // ADD note here
      
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
            note: note || '', // ADD note field here
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
            note: note || '', // ADD note field here
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
app.delete('/api/bills/month/:year/:month', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/fix-index', requireAuth(['admin', 'moderator']), async (req, res) => {
  try {
    const collection = mongoose.connection.collection('bills');
    await collection.dropIndex("name_1_month_1_year_1");
    res.json({ success: true, message: "Index removed successfully" });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
// Add this route to REMOVE the problematic index
app.get('/api/remove-duplicate-index', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/office-supplies', requireAuth(['admin', 'moderator']), async (req, res) => {
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
// Add office supplies (multiple) - UPDATED with note field
app.post('/api/office-supplies', requireAuth(['admin', 'moderator']), async (req, res) => {
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
      const { name, date, price, paymentMethod, note } = supplyData;
      
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
          paymentMethod: paymentMethod || 'Cash',
          note: note || ''
        });
        
        await supply.save();
        savedSupplies.push(supply);
        console.log(`Saved supply: ${name} with note: ${note}`);
        
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
app.delete('/api/office-supplies/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/office-supplies/stats', requireAuth(['admin', 'moderator']), async (req, res) => {
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
// Update single office supply - UPDATED with note field
app.put('/api/office-supplies/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid supply ID format' 
      });
    }
    
    const { name, date, price, paymentMethod, note } = req.body;
    
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
      note: note || '',
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
// Add this route to add note field to existing office supplies
app.post('/api/migrate-office-supplies-note', requireAuth(['admin', 'moderator']), async (req, res) => {
  try {
    // Add note field to all existing office supplies
    const result = await OfficeSupply.updateMany(
      { note: { $exists: false } },
      {
        $set: {
          note: ''
        }
      }
    );
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} office supplies with note field`,
      data: result
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});



// =============== SOFTWARE SUBSCRIPTION ROUTES ===============

// Get all software subscriptions
app.get('/api/software-subscriptions', requireAuth(['admin']),  async (req, res) => {
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
// Add software subscriptions (multiple) - UPDATED with duration fields
app.post('/api/software-subscriptions', requireAuth(['admin']), async (req, res) => {
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
      const { softwareName, amount, date, paymentMethod, note, durationNumber, durationUnit } = subData;
      
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
          note: note || '',
          durationNumber: durationNumber ? parseInt(durationNumber) : null,
          durationUnit: durationUnit || null
        });
        
        await subscription.save();
        savedSubscriptions.push(subscription);
        console.log(`Saved subscription: ${softwareName} with duration: ${durationNumber} ${durationUnit}`);
        
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
// Update single subscription - UPDATED with duration fields
app.put('/api/software-subscriptions/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating subscription with ID: ${id}`, req.body);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid subscription ID format' 
      });
    }
    
    const { softwareName, amount, date, paymentMethod, note, durationNumber, durationUnit } = req.body;
    
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
      durationNumber: durationNumber ? parseInt(durationNumber) : null,
      durationUnit: durationUnit || null,
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
app.delete('/api/software-subscriptions/:id', requireAuth(['admin']),  async (req, res) => {
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
app.get('/api/software-subscriptions/stats', requireAuth(['admin']),  async (req, res) => {
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
// Add this route to add duration fields to existing subscriptions
app.post('/api/migrate-subscriptions-duration', requireAuth(['admin']), async (req, res) => {
  try {
    // Add durationNumber and durationUnit fields to all existing subscriptions
    const result = await SoftwareSubscription.updateMany(
      {
        $or: [
          { durationNumber: { $exists: false } },
          { durationUnit: { $exists: false } }
        ]
      },
      {
        $set: {
          durationNumber: null,
          durationUnit: null
        }
      }
    );
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} subscriptions with duration fields`,
      data: result
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


// =============== TRANSPORT EXPENSE ROUTES ===============

// Get all transport expenses
app.get('/api/transport-expenses',requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.post('/api/transport-expenses', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.put('/api/transport-expenses/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.delete('/api/transport-expenses/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/transport-expenses/stats', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/extra-expenses', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.post('/api/extra-expenses', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.put('/api/extra-expenses/:id',requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.delete('/api/extra-expenses/:id', requireAuth(['admin', 'moderator']), async (req, res) => {
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
app.get('/api/extra-expenses/stats', requireAuth(['admin', 'moderator']), async (req, res) => {
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



// =============== FOOD COST ROUTES ===============

// Get all food costs
app.get('/api/food-costs', requireAuth(['admin', 'moderator', 'user']), async (req, res) => {
  try {
    const foodCosts = await FoodCost.find().sort({ date: -1 });
    res.json({
      success: true,
      count: foodCosts.length,
      data: foodCosts
    });
  } catch (error) {
    console.error('Error fetching food costs:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get single food cost by ID
app.get('/api/food-costs/:id', requireAuth(['admin', 'moderator', 'user']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid food cost ID format' 
      });
    }
    
    const foodCost = await FoodCost.findById(id);
    
    if (!foodCost) {
      return res.status(404).json({ 
        success: false, 
        message: 'Food cost record not found' 
      });
    }
    
    res.json({
      success: true,
      data: foodCost
    });
  } catch (error) {
    console.error('Error fetching food cost:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add new food cost (ONE ENTRY PER DAY)
app.post('/api/food-costs', requireAuth(['admin', 'moderator', 'user']), async (req, res) => {
  try {
    console.log('Received food cost data:', req.body);
    
    const { date, cost, note } = req.body;
    
    // Validation
    if (!date || !cost) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date and cost amount are required' 
      });
    }
    
    // Parse the date
    const foodDate = new Date(date);
    
    // Check if food cost already exists for this date
    const existingFoodCost = await FoodCost.findOne({
      date: {
        $gte: new Date(foodDate.setHours(0, 0, 0, 0)),
        $lt: new Date(foodDate.setHours(23, 59, 59, 999))
      }
    });
    
    if (existingFoodCost) {
      return res.status(400).json({
        success: false,
        message: `Food cost record for ${foodDate.toLocaleDateString()} already exists. Please edit the existing record instead.`,
        existingData: existingFoodCost
      });
    }
    
    const foodCost = new FoodCost({
      date: new Date(date),
      cost: parseFloat(cost),
      note: note || ''
    });
    
    await foodCost.save();
    
    console.log('Food cost saved:', foodCost);
    
    res.status(201).json({
      success: true,
      message: 'Food cost saved successfully',
      data: foodCost
    });
  } catch (error) {
    console.error('Error saving food cost:', error);
    
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Food cost record for this date already exists. Please edit the existing record instead.`
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update food cost
app.put('/api/food-costs/:id', requireAuth(['admin', 'moderator', 'user']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid food cost ID format' 
      });
    }
    
    const { date, cost, note } = req.body;
    
    // Validation
    if (!date || !cost) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date and cost amount are required' 
      });
    }
    
    // Parse the date
    const foodDate = new Date(date);
    
    // Check if another food cost already exists for this date (excluding current record)
    const existingFoodCost = await FoodCost.findOne({
      _id: { $ne: id }, // Exclude current record
      date: {
        $gte: new Date(foodDate.setHours(0, 0, 0, 0)),
        $lt: new Date(foodDate.setHours(23, 59, 59, 999))
      }
    });
    
    if (existingFoodCost) {
      return res.status(400).json({
        success: false,
        message: `Another food cost record for ${foodDate.toLocaleDateString()} already exists. Please choose a different date.`
      });
    }
    
    const updateData = {
      date: new Date(date),
      cost: parseFloat(cost),
      note: note || '',
      updatedAt: Date.now()
    };
    
    const foodCost = await FoodCost.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!foodCost) {
      return res.status(404).json({ 
        success: false, 
        message: 'Food cost record not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Food cost updated successfully',
      data: foodCost
    });
  } catch (error) {
    console.error('Error updating food cost:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update: Another food cost record for this date already exists.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete food cost
app.delete('/api/food-costs/:id', requireAuth(['admin', 'moderator', 'user']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const foodCost = await FoodCost.findByIdAndDelete(id);
    
    if (!foodCost) {
      return res.status(404).json({ 
        success: false, 
        message: 'Food cost record not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Food cost deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting food cost:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get food costs by month
app.get('/api/food-costs/month/:year/:month', requireAuth(['admin', 'moderator', 'user']), async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const foodCosts = await FoodCost.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });
    
    const totalCost = foodCosts.reduce((sum, cost) => sum + cost.cost, 0);
    
    res.json({
      success: true,
      data: {
        month: `${year}-${String(month).padStart(2, '0')}`,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
        totalCost,
        averagePerDay: foodCosts.length > 0 ? totalCost / foodCosts.length : 0,
        records: foodCosts.length,
        foodCosts
      }
    });
  } catch (error) {
    console.error('Error fetching monthly food costs:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get food cost statistics
app.get('/api/food-costs/stats', requireAuth(['admin', 'moderator', 'user']), async (req, res) => {
  try {
    const foodCosts = await FoodCost.find().sort({ date: 1 });
    
    const totalCost = foodCosts.reduce((sum, cost) => sum + cost.cost, 0);
    const totalDays = foodCosts.length;
    
    // Group by month
    const monthlyStats = {};
    foodCosts.forEach(cost => {
      const date = new Date(cost.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyStats[monthYear]) {
        monthlyStats[monthYear] = {
          month: monthYear,
          monthName: monthName,
          totalCost: 0,
          days: 0,
          averagePerDay: 0
        };
      }
      
      monthlyStats[monthYear].totalCost += cost.cost;
      monthlyStats[monthYear].days += 1;
    });
    
    // Calculate averages
    Object.values(monthlyStats).forEach(stat => {
      stat.averagePerDay = stat.days > 0 ? stat.totalCost / stat.days : 0;
    });
    
    res.json({
      success: true,
      data: {
        totalCost,
        totalDays,
        averagePerDay: totalDays > 0 ? totalCost / totalDays : 0,
        monthlyStats: Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month))
      }
    });
  } catch (error) {
    console.error('Error in food cost stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check if food cost exists for a specific date
app.get('/api/food-costs/check-date', requireAuth(['admin', 'moderator', 'user']), async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date query parameter is required' 
      });
    }
    
    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format' 
      });
    }
    
    const startOfDay = new Date(checkDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(checkDate.setHours(23, 59, 59, 999));
    
    const existingFoodCost = await FoodCost.findOne({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    if (existingFoodCost) {
      return res.json({
        success: true,
        exists: true,
        message: `Food cost record for ${checkDate.toLocaleDateString()} already exists`,
        data: existingFoodCost
      });
    }
    
    res.json({
      success: true,
      exists: false,
      message: 'No food cost record found for this date'
    });
  } catch (error) {
    console.error('Error checking date:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add this with your other route logging
// =============== HEALTH CHECK (Public) ===============

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Backend is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// =============== USER MANAGEMENT ROUTES ===============

// Get all users (admin only)
app.get('/api/users', requireAuth(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// Get single user by ID
app.get('/api/users/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
});

// Update user (admin only)
app.put('/api/users/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    const { name, email, role, isActive } = req.body;
    
    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }
    
    // Check if email already exists (excluding current user)
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: id }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    const updateData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: Date.now()
    };
    
    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    // Prevent admin from deleting themselves
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
});

// Toggle user active status
app.put('/api/users/:id/toggle-status', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    const { isActive } = req.body;
    
    // Prevent admin from deactivating themselves
    if (id === req.user._id.toString() && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      { isActive, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user status'
    });
  }
});

// Change user password (admin can change any user's password)
app.put('/api/users/:id/change-password', requireAuth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update password (pre-save middleware will hash it)
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
});


// =============== ADD ADMIN USER CREATION UTILITY ===============

// Add this route to create first admin (run once)
app.post('/api/setup-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }
    
    // Create admin user
    const adminUser = new User({
      name,
      email,
      password,
      role: 'admin'
    });
    
    await adminUser.save();
    
    // Remove password from response
    const userResponse = adminUser.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: userResponse
    });
    
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin user'
    });
  }
});


const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`👥 Employee API: http://localhost:${PORT}/api/employees`);
  console.log(`💰 Office Rent API: http://localhost:${PORT}/api/office-rents`);
  console.log(`💡 Bills API: http://localhost:${PORT}/api/bills`);
  console.log(`🍽️  Food Costs API: http://localhost:${PORT}/api/food-costs`);

   console.log(`💡 To create admin: POST http://localhost:${PORT}/api/setup-admin`);

});