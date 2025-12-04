# Snapify Documentation Website - Quick Start Guide

## 🚀 Quick Start

### Development Mode
```bash
cd /var/www/snapify/docs-website
npm install
npm run dev
```
Access at: **http://localhost:3004**

### Production Build
```bash
cd /var/www/snapify/docs-website
npm run build
```
Output: `/var/www/snapify/docs-website-dist/`

## 📁 Project Structure

```
docs-website/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Layout.tsx       # Main layout with header/footer
│   │   ├── CodeBlock.tsx    # Syntax-highlighted code blocks
│   │   └── ApiEndpointCard.tsx  # API endpoint documentation cards
│   ├── context/             # React context providers
│   │   ├── ThemeContext.tsx     # Theme management
│   │   └── DocumentationContext.tsx  # Documentation state
│   ├── pages/               # Route pages
│   │   ├── HomePage.tsx
│   │   ├── Architecture.tsx
│   │   ├── ApiReference.tsx
│   │   ├── InteractiveApiExplorer.tsx
│   │   ├── DeveloperGuides.tsx
│   │   └── SearchResults.tsx
│   ├── utils/               # Utility functions
│   │   └── documentationLoader.ts
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── index.html               # HTML template
├── package.json             # Dependencies
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
└── tsconfig.json            # TypeScript config
```

## 🎨 Features

### 1. Interactive API Explorer
- Test API endpoints live
- View request/response examples
- Generate code in multiple languages
- Copy code snippets

### 2. Search Functionality
- Fuzzy search across all docs
- Real-time suggestions
- Keyboard shortcut: `Cmd/Ctrl + K`
- Categorized results

### 3. Theme Support
- Light mode
- Dark mode
- System preference detection
- Persistent theme selection

### 4. Comprehensive Documentation
- Architecture overview
- API reference
- Developer guides
- Code examples
- Best practices

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint code
npm run lint
```

### Adding New Content

#### Add a New Page
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Layout.tsx`

#### Add API Endpoint Documentation
1. Open `src/pages/ApiReference.tsx`
2. Add endpoint to appropriate category
3. Use `ApiEndpointCard` component
4. Include request/response examples

#### Add Code Examples
Use the `CodeBlock` component:
```tsx
<CodeBlock
  code={`your code here`}
  language="javascript"
  showLineNumbers={true}
/>
```

## 🚢 Deployment

### Option 1: Static Hosting (Recommended)

#### Netlify
```bash
npm run build
# Drag and drop docs-website-dist folder to Netlify
```

#### Vercel
```bash
npm run build
vercel --prod
```

#### GitHub Pages
```bash
npm run build
# Push docs-website-dist to gh-pages branch
```

### Option 2: Self-Hosted

#### Using Nginx
```nginx
server {
    listen 80;
    server_name docs.snapify.com;
    root /var/www/snapify/docs-website-dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Using Apache
```apache
<VirtualHost *:80>
    ServerName docs.snapify.com
    DocumentRoot /var/www/snapify/docs-website-dist

    <Directory /var/www/snapify/docs-website-dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Enable React Router
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

### Option 3: Docker

Create `Dockerfile`:
```dockerfile
FROM nginx:alpine
COPY docs-website-dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t snapify-docs .
docker run -p 80:80 snapify-docs
```

## 🔧 Configuration

### Environment Variables
Create `.env` file:
```env
VITE_API_BASE_URL=https://api.snapify.com
VITE_APP_VERSION=1.0.0
```

### Vite Configuration
Edit `vite.config.ts` for:
- Build output directory
- Server port
- Path aliases
- Plugin configuration

### Tailwind Configuration
Edit `tailwind.config.js` for:
- Custom colors
- Font families
- Spacing scale
- Breakpoints

## 📊 Build Output

### Production Build Stats
```
✓ 1156 modules transformed
- index.html: 0.52 kB (gzipped: 0.33 kB)
- CSS bundle: 5.94 kB (gzipped: 1.75 kB)
- JS bundle: 925.12 kB (gzipped: 313.66 kB)
Build time: ~3s
```

### Performance Optimizations
- Code splitting by route
- Tree shaking
- CSS minification
- Asset optimization
- Lazy loading

## 🐛 Troubleshooting

### Build Errors

**Issue**: TypeScript errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Module not found
```bash
# Check imports and paths
npm run type-check
```

### Runtime Errors

**Issue**: Blank page
- Check browser console for errors
- Verify all routes are configured
- Check API base URL configuration

**Issue**: Search not working
- Verify Fuse.js is installed
- Check DocumentationContext provider
- Ensure search data is loaded

## 📝 Best Practices

### Code Organization
- Keep components small and focused
- Use TypeScript for type safety
- Follow React hooks best practices
- Implement proper error boundaries

### Performance
- Lazy load route components
- Optimize images and assets
- Use React.memo for expensive components
- Implement virtual scrolling for long lists

### Accessibility
- Use semantic HTML
- Add ARIA labels
- Support keyboard navigation
- Ensure color contrast

## 🔗 Useful Links

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [TypeScript](https://www.typescriptlang.org)

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the walkthrough documentation
3. Check browser console for errors
4. Verify all dependencies are installed

## 🎯 Next Steps

1. **Customize Content**: Update documentation with your specific API details
2. **Add Analytics**: Integrate Google Analytics or similar
3. **Set Up CI/CD**: Automate builds and deployments
4. **Add Tests**: Implement unit and integration tests
5. **Optimize SEO**: Add meta tags and sitemap
6. **Enable PWA**: Add service worker for offline support

---

**Current Status**: ✅ Development server running on http://localhost:3004
**Build Status**: ✅ Production build successful
**Deployment**: Ready for deployment to any hosting service
