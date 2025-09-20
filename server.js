const express = require('express');
const path = require('path');
const ejsMate = require('ejs-mate');
const fetch = require('node-fetch');
const app = express();

// Set up EJS with ejs-mate for layouts
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'RX Prescribers - Find Healthcare Providers',
    user: null // Will be populated when auth is implemented
  });
});

app.get('/search', async (req, res) => {
  const { drug, zip, radius = 25 } = req.query;

  if (!drug || !zip) {
    return res.render('search', {
      title: 'Search Prescribers',
      error: 'Drug and ZIP code are required',
      results: null,
      searchParams: { drug, zip, radius }
    });
  }

  try {
    // Use the existing API endpoint
    const apiUrl = `https://api.rxprescribers.com/api.php?drug=${encodeURIComponent(drug)}&zip=${encodeURIComponent(zip)}&radius=${radius}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const results = await response.json();

    res.render('search', {
      title: 'Search Results',
      error: null,
      results: results,
      searchParams: { drug, zip, radius }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.render('search', {
      title: 'Search Prescribers',
      error: 'Failed to fetch prescriber data. Please try again.',
      results: null,
      searchParams: { drug, zip, radius }
    });
  }
});

app.get('/about', (req, res) => {
  res.render('about', {
    title: 'About RX Prescribers'
  });
});

app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RX Prescribers server running on port ${PORT}`);
});

module.exports = app;
