# Deployment Process Guide

## Prerequisites

### 1. System Requirements
- Node.js >= 18.18.0
- npm >= 9.0.0
- Git
- Vercel CLI

### 2. Account Requirements
- GitHub account
- Vercel account
- Required API keys:
  - OpenAI API key
  - Supabase credentials
  - Brevo API credentials
& "C:\Program Files\Git\bin\git.exe" add .
### 3. Initial Setup

#### Install Global Dependencies
```bash
# Install Vercel CLI globally
npm install -g vercel

# Verify installations
node --version
npm --version
git --version
vercel --version
```

#### Authentication Setup
```bash
# Login to Vercel
vercel login

# Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### Project Setup
1. Ensure project is a valid Next.js project
2. Initialize Git repository (if not already done):
   ```bash
   git init
   git remote add origin <repository-url>
   ```
3. Link to Vercel:
   ```bash
   vercel link
   ```

## Quick Reference Commands

### 1. Git Workflow
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "type: brief description of changes"

# Push to GitHub
git push origin master
```

### 2. Vercel Deployment
```bash
# Deploy to production
vercel --prod --yes

# Check deployment logs
vercel logs <deployment-url>
```

## Step-by-Step Deployment Process

### 1. Pre-Deployment Checks
1. Run local build to catch errors:
   ```bash
   npm run build
   ```

2. Verify all environment variables are set in `.env.local`:
   ```bash
   # Required Environment Variables
   OPENAI_API_KEY=your_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   BREVO_API_KEY=your_brevo_api_key
   BREVO_SENDER_EMAIL=your_sender_email
   BREVO_SENDER_NAME=your_sender_name
   BASE_URL=https://newsletter-lvs56aih1-vicsicards-projects.vercel.app
   ```

3. Run type checking:
   ```bash
   npm run type-check
   ```

### 2. Version Control
1. Stage changes:
   ```bash
   git add .
   ```

2. Create descriptive commit:
   ```bash
   git commit -m "type: description"
   ```
   Types: feat, fix, docs, style, refactor, test, chore

3. Push to repository:
   ```bash
   git push origin master
   ```

### 3. Deployment
1. Deploy to Vercel:
   ```bash
   vercel --prod --yes
   ```

2. Monitor deployment:
   ```bash
   vercel logs <deployment-url>
   ```

### 4. Post-Deployment Verification
1. Check build logs in Vercel Dashboard
2. Verify environment variables in Vercel Dashboard
3. Test deployed application functionality
4. Verify all API integrations are working

## Latest Deployment Status

### Production Deployment (December 30, 2024)
- ✅ Successfully deployed to Vercel
- ✅ All environment variables configured correctly
- ✅ Email delivery system verified
- ✅ Newsletter generation pipeline tested
- ✅ Database connections confirmed
- 🌐 Production URL: https://newsletter-app-ecru.vercel.app

### Verified Integrations
- ✅ OpenAI API (GPT-4 & DALL-E)
- ✅ Brevo Email Service
- ✅ Supabase Database
- ✅ Vercel Hosting

### Production Environment Variables
```bash
# Required Environment Variables (✅ All Configured)
OPENAI_API_KEY=configured
SUPABASE_URL=configured
SUPABASE_SERVICE_ROLE_KEY=configured
NEXT_PUBLIC_SUPABASE_ANON_KEY=configured
BREVO_API_KEY=configured
BREVO_SENDER_EMAIL=configured
BREVO_SENDER_NAME=configured
BASE_URL=https://newsletter-app-ecru.vercel.app
```

### Deployment Verification Checklist
- ✅ Build successful
- ✅ Environment variables loaded
- ✅ Database connections active
- ✅ API integrations functional
- ✅ Email delivery system operational
- ✅ Newsletter generation working
- ✅ Image generation confirmed
- ✅ HTML formatting correct

## Troubleshooting Common Issues

### Build Failures
1. Check Vercel build logs for errors:
   ```bash
   vercel logs <deployment-url>
   ```
2. Common issues:
   - Type errors
   - Missing environment variables
   - Import/export issues
   - Dependency conflicts

### Environment Variables
1. List current environment variables:
   ```bash
   vercel env ls
   ```
2. Add missing variables:
   ```bash
   vercel env add
   ```
3. Verify in Vercel Dashboard:
   - Project Settings > Environment Variables
4. Check variable names match exactly
5. Ensure `NEXT_PUBLIC_` prefix for client-side variables

### Type Errors
1. Run type check locally:
   ```bash
   npm run type-check
   ```
2. Fix any type mismatches
3. Redeploy after fixes

### Dependency Issues
1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
2. Remove node_modules:
   ```bash
   rm -rf node_modules
   ```
3. Reinstall dependencies:
   ```bash
   npm install
   ```

## Recovery Steps

### If Deployment Fails
1. Read error logs:
   ```bash
   vercel logs <deployment-url>
   ```
2. Fix issues locally
3. Commit changes
4. Redeploy

### Rollback to Previous Version
1. List deployments:
   ```bash
   vercel ls
   ```
2. View deployment details:
   ```bash
   vercel inspect <deployment-url>
   ```
3. Rollback:
   ```bash
   vercel rollback <deployment-url>
   ```

## Monitoring and Maintenance

### 1. Regular Checks
```bash
# View recent deployments
vercel ls

# Check project status
vercel project ls

# Monitor logs
vercel logs

# Check environment variables
vercel env ls
```

### 2. Performance Monitoring
1. Use Vercel Analytics
2. Monitor build times
3. Check error rates
4. Review API performance

## Best Practices

1. **Always Test Locally First**
   - Run build
   - Check for type errors
   - Test main functionality
   - Verify API integrations

2. **Commit Messages**
   - Use conventional commit format
   - Include clear descriptions
   - Reference issues if applicable
   - Follow semantic versioning

3. **Environment Variables**
   - Never commit sensitive keys
   - Document all required variables
   - Use different values for dev/prod
   - Regularly rotate API keys

4. **Monitoring**
   - Check build logs
   - Verify deployment status
   - Test critical paths after deploy
   - Monitor error rates

5. **Security**
   - Keep dependencies updated
   - Review security alerts
   - Implement proper authentication
   - Follow security best practices

## Deployment Process

## Overview
This document outlines the deployment process for the newsletter application. We use Vercel for hosting and Supabase for the database.

## Prerequisites
- Vercel CLI installed
- Supabase CLI installed
- Access to production environment variables
- GitHub repository access

## Environment Variables
Required environment variables in production:
```env
# Database
DATABASE_URL=your_supabase_db_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Email Service (Brevo)
BREVO_API_KEY=your_api_key
BREVO_SENDER_EMAIL=your_sender_email
BREVO_SENDER_NAME=your_sender_name

# OpenAI (for content generation)
OPENAI_API_KEY=your_openai_key

# Application
NEXTAUTH_URL=your_app_url
NEXTAUTH_SECRET=your_auth_secret
```

## Deployment Steps

### 1. Pre-deployment Checks
```bash
# Run type checking
npm run type-check

# Run tests
npm run test

# Run linting
npm run lint
```

### 2. Database Migration
```bash
# Generate migration
npx supabase db diff -f migration_name

# Apply migration
npx supabase db push
```

### 3. Vercel Deployment
```bash
# Deploy to production
vercel --prod

# Deploy to preview (for testing)
vercel
```

### 4. Post-deployment Verification
1. Check application health endpoint
2. Verify database connections
3. Test email sending functionality
4. Monitor error rates

## Rollback Process

### 1. Code Rollback
```bash
# Revert to previous deployment
vercel rollback
```

### 2. Database Rollback
```bash
# Revert last migration
npx supabase db reset
npx supabase db push --version previous
```

## Monitoring

### 1. Application Metrics
- Vercel Analytics Dashboard
- Error tracking in Sentry
- Custom application logs

### 2. Database Metrics
- Supabase Dashboard
- Connection pool status
- Query performance metrics

### 3. Email Service
- Brevo Dashboard
- Delivery rates
- Bounce rates

## Deployment Schedule
- Regular deployments: Tuesday and Thursday
- Emergency fixes: As needed
- Database migrations: During off-peak hours

## Security Considerations
1. Rotate API keys regularly
2. Review environment variables
3. Check for security vulnerabilities
4. Monitor unusual activity

## Troubleshooting

### Common Issues
1. Database connection errors
   - Check connection string
   - Verify network access

2. Email sending failures
   - Verify Brevo API key
   - Check rate limits

3. OpenAI API issues
   - Monitor rate limits
   - Check API key permissions

### Emergency Contacts
- DevOps Team: devops@company.com
- Database Admin: dba@company.com
- Security Team: security@company.com
