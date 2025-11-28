# Deploying to Vercel

This guide will help you deploy your Next.js application to Vercel.

## Prerequisites
- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Your project is ready (build tested ✓)

## Deployment Options

### Option 1: Deploy via Vercel CLI (Recommended for first-time deployment)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy your project**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No** (for first deployment)
   - What's your project's name? (default is fine or choose your own)
   - In which directory is your code located? **./** (current directory)
   - Want to override the settings? **No** (defaults are fine for Next.js)

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub/GitLab/Bitbucket (Recommended for CI/CD)

1. **Push your code to a Git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import project on Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import" next to your repository
   - Configure your project:
     - Framework Preset: **Next.js** (auto-detected)
     - Root Directory: **./** (default)
     - Build Command: `npm run build` (default)
     - Output Directory: `.next` (default)
     - Install Command: `npm install` (default)
   - Click "Deploy"

3. **Automatic deployments**: 
   - Every push to `main` branch will trigger a production deployment
   - Pull requests will create preview deployments automatically

### Option 3: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Drag and drop your project folder or click to browse
3. Vercel will automatically detect Next.js and configure settings
4. Click "Deploy"

## Project Configuration

Your project is already configured for Vercel:
- ✅ Next.js framework detected
- ✅ TypeScript support enabled
- ✅ Build script configured
- ✅ Output directory set correctly

## Environment Variables

If you need to add environment variables:
1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add your variables for Production, Preview, and Development
4. Redeploy your application

## Build Settings

Default build settings (already configured):
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

## Custom Domain

After deployment, you can add a custom domain:
1. Go to your project settings
2. Navigate to "Domains"
3. Add your domain and follow DNS configuration instructions

## Troubleshooting

If you encounter issues:
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version compatibility (Vercel uses Node 18.x by default)
4. Check for any environment variables that might be needed

## Post-Deployment

After successful deployment:
- Your app will be available at `https://your-project.vercel.app`
- Vercel Analytics is already integrated
- Automatic HTTPS is enabled
- Global CDN distribution is active

