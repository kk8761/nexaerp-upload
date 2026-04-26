# Server-Side Rendering (SSR) Setup Documentation

## Overview

NexaERP uses **EJS (Embedded JavaScript)** as the template engine for server-side rendering. This provides a traditional, monolithic approach to rendering HTML pages on the server before sending them to the client.

## Architecture

### Template Engine: EJS

- **Version**: 5.0.2
- **Configuration**: Set in `server/src/server.ts`
- **Views Directory**: `server/src/views/`
- **File Extension**: `.ejs`

### Directory Structure

```
server/src/views/
├── layouts/
│   └── main.ejs           # Base layout template
├── pages/
│   ├── index.ejs          # Home/Login page
│   ├── dashboard.ejs      # Dashboard page
│   └── placeholder.ejs    # Placeholder for modules under development
└── partials/
    ├── header.ejs         # Header navigation
    └── footer.ejs         # Footer component
```

## Configuration

### 1. View Engine Setup (server.ts)

```typescript
// View engine configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Disable view caching in development for hot reload
if (process.env.NODE_ENV !== 'production') {
  app.set('view cache', false);
}
```

### 2. Static Asset Serving

Static assets are served from the root directory with caching headers:

```typescript
// CSS files
app.use('/css', express.static(path.join(__dirname, '../../css'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));

// JavaScript files
app.use('/js', express.static(path.join(__dirname, '../../js'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));

// Assets (images, fonts, etc.)
app.use('/assets', express.static(path.join(__dirname, '../../assets'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));
```

**Caching Strategy**:
- **Production**: 1 year cache for CSS/JS/assets, 1 day for HTML
- **Development**: No caching for hot reload

### 3. View Routes

Routes are defined in `server/src/routes/viewRoutes.ts`:

```typescript
// Authentication pages
router.get('/', ViewController.renderHome);
router.get('/login', ViewController.renderHome);
router.get('/register', ViewController.renderHome);

// Dashboard
router.get('/dashboard', ViewController.renderDashboard);

// Module pages (placeholder routes)
router.get('/crm/leads', ViewController.renderPlaceholder('CRM - Leads'));
router.get('/inventory/products', ViewController.renderPlaceholder('Inventory - Products'));
// ... more module routes
```

## View Controller

The `ViewController` class handles rendering logic:

### Methods

#### `renderHome(req, res)`
Renders the home/login page with authentication forms.

#### `renderDashboard(req, res)`
Renders the main dashboard with stats and user information.

#### `renderPlaceholder(moduleName)`
Returns a function that renders a placeholder page for modules under development.

### Example Usage

```typescript
export class ViewController {
  static async renderDashboard(_req: Request, res: Response): Promise<void> {
    const user = { name: 'Demo User', email: 'demo@nexaerp.com' };
    const stats = {
      revenue: 125000,
      orders: 342,
      customers: 156,
      products: 892
    };

    await renderWithLayout(res, 'pages/dashboard.ejs', {
      title: 'Dashboard — NexaERP',
      description: 'NexaERP Dashboard',
      bodyClass: 'dashboard-page',
      showHeader: true,
      showFooter: false,
      user,
      stats,
      pageStyles: '<link rel="stylesheet" href="/css/dashboard.css" />',
      pageScripts: '<script src="/js/dashboard.js"></script>'
    });
  }
}
```

## View Helpers

The `viewHelpers.ts` module provides utility functions for templates:

### Available Helpers

| Helper | Description | Example |
|--------|-------------|---------|
| `formatCurrency(amount, currency)` | Format numbers as currency | `formatCurrency(1000)` → "₹1,000.00" |
| `formatDate(date)` | Format dates | `formatDate(new Date())` → "Jan 15, 2024" |
| `formatDateTime(date)` | Format date and time | `formatDateTime(new Date())` → "Jan 15, 2024, 10:30 AM" |
| `truncate(text, length)` | Truncate text with ellipsis | `truncate("Long text", 10)` → "Long text..." |
| `getInitials(name)` | Get initials from name | `getInitials("John Doe")` → "JD" |
| `pluralize(count, singular, plural)` | Pluralize words | `pluralize(2, "item")` → "items" |
| `getStatusBadge(status)` | Generate status badge HTML | `getStatusBadge("active")` → `<span class="badge badge-green">Active</span>` |
| `getProgressBar(percentage, color)` | Generate progress bar HTML | `getProgressBar(75, "blue")` → Progress bar HTML |

### Usage in Templates

Helpers are automatically available in all EJS templates:

```ejs
<p>Total: <%= formatCurrency(stats.revenue) %></p>
<p>Date: <%= formatDate(order.createdAt) %></p>
<p>Status: <%- getStatusBadge(order.status) %></p>
```

## Layout System

### Main Layout (layouts/main.ejs)

The main layout provides the HTML structure:

```ejs
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title><%= title || 'NexaERP' %></title>
  <link rel="stylesheet" href="/css/design-system.css" />
  <%- pageStyles || '' %>
</head>
<body class="<%= bodyClass || '' %>">
  <%- include('../partials/header') %>
  
  <main id="main-content">
    <%- body %>
  </main>
  
  <%- include('../partials/footer') %>
  
  <script src="/js/utils.js"></script>
  <%- pageScripts || '' %>
</body>
</html>
```

### Layout Options

| Option | Type | Description |
|--------|------|-------------|
| `title` | string | Page title |
| `description` | string | Meta description |
| `bodyClass` | string | CSS class for body element |
| `showHeader` | boolean | Show/hide header (default: true) |
| `showFooter` | boolean | Show/hide footer (default: true) |
| `user` | object | Current user data |
| `pageStyles` | string | Additional CSS to include |
| `pageScripts` | string | Additional JS to include |

## Creating New Pages

### Step 1: Create Template

Create a new EJS file in `server/src/views/pages/`:

```ejs
<!-- server/src/views/pages/my-page.ejs -->
<div class="my-page-container">
  <h1><%= title %></h1>
  <p><%= description %></p>
  
  <% if (items && items.length > 0) { %>
    <ul>
      <% items.forEach(item => { %>
        <li><%= item.name %></li>
      <% }); %>
    </ul>
  <% } %>
</div>
```

### Step 2: Add Controller Method

Add a method to `ViewController`:

```typescript
static async renderMyPage(_req: Request, res: Response): Promise<void> {
  const user = { name: 'Demo User', email: 'demo@nexaerp.com' };
  const items = [
    { name: 'Item 1' },
    { name: 'Item 2' }
  ];

  await renderWithLayout(res, 'pages/my-page.ejs', {
    title: 'My Page — NexaERP',
    description: 'This is my custom page',
    bodyClass: 'my-page',
    showHeader: true,
    showFooter: true,
    user,
    items,
    pageStyles: '<link rel="stylesheet" href="/css/my-page.css" />',
    pageScripts: '<script src="/js/my-page.js"></script>'
  });
}
```

### Step 3: Add Route

Add a route in `viewRoutes.ts`:

```typescript
router.get('/my-page', ViewController.renderMyPage);
```

## Best Practices

### 1. Security

- **Always escape user input**: Use `<%= %>` for automatic escaping
- **Use `<%- %>` only for trusted HTML**: Like helper functions that generate HTML
- **Validate data before rendering**: Check for null/undefined values

```ejs
<!-- Good: Escaped output -->
<p><%= user.name %></p>

<!-- Bad: Unescaped output (XSS risk) -->
<p><%- user.name %></p>

<!-- Good: Trusted helper function -->
<p><%- getStatusBadge(order.status) %></p>
```

### 2. Performance

- **Enable view caching in production**: Already configured
- **Minimize data passed to views**: Only send what's needed
- **Use partials for reusable components**: Header, footer, etc.
- **Optimize static assets**: Use CDN in production

### 3. Maintainability

- **Keep templates simple**: Move complex logic to controllers
- **Use helper functions**: For formatting and common operations
- **Follow naming conventions**: `pages/`, `partials/`, `layouts/`
- **Document custom helpers**: Add JSDoc comments

### 4. Error Handling

The `renderWithLayout` function includes error handling:

```typescript
try {
  // Render page
} catch (error) {
  console.error('View rendering error:', error);
  res.status(500).send('Error rendering page');
}
```

## Testing SSR

### Manual Testing

1. Start the development server:
   ```bash
   cd server
   npm run dev
   ```

2. Visit pages in browser:
   - Home: http://localhost:5000/
   - Dashboard: http://localhost:5000/dashboard
   - Module pages: http://localhost:5000/crm/leads

3. Check for:
   - Correct HTML rendering
   - Static assets loading
   - No console errors
   - Proper layout rendering

### View Source

Right-click → "View Page Source" to verify server-side rendering:
- HTML should be fully rendered
- No loading spinners or "Loading..." text
- All content visible in source

## Troubleshooting

### Issue: Template not found

**Error**: `Error: Failed to lookup view "pages/my-page.ejs"`

**Solution**: 
- Check file path: `server/src/views/pages/my-page.ejs`
- Verify views directory is set correctly in `server.ts`
- Ensure file extension is `.ejs`

### Issue: Helper function not available

**Error**: `ReferenceError: formatCurrency is not defined`

**Solution**:
- Check that helper is added to `enhancedOptions` in `renderWithLayout`
- Verify helper is exported from `viewHelpers.ts`

### Issue: Static assets not loading

**Error**: 404 for CSS/JS files

**Solution**:
- Check static middleware configuration in `server.ts`
- Verify file paths are correct
- Check file permissions

### Issue: Changes not reflecting

**Solution**:
- Restart dev server: `npm run dev`
- Clear browser cache
- Check that `view cache` is disabled in development

## Future Enhancements

### Planned Improvements

1. **Template Fragments**: Reusable components for common UI patterns
2. **Data Caching**: Cache frequently accessed data
3. **Progressive Enhancement**: Add client-side interactivity
4. **SEO Optimization**: Meta tags, structured data
5. **Internationalization**: Multi-language support
6. **Performance Monitoring**: Track rendering times

### Migration Path

If moving to a SPA framework in the future:
1. Keep SSR for initial page load (SEO)
2. Hydrate with client-side framework
3. Use API routes for data fetching
4. Implement progressive enhancement

## References

- [EJS Documentation](https://ejs.co/)
- [Express.js Views](https://expressjs.com/en/guide/using-template-engines.html)
- [Server-Side Rendering Best Practices](https://web.dev/rendering-on-the-web/)

---

**Last Updated**: Task 1.2 Completion
**Maintained By**: NexaERP Development Team
