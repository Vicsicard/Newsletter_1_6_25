# Deployment Process Guide

<!-- AI-DEPLOYMENT-CONFIG
{
  "platform": "vercel",
  "buildTool": "npm",
  "projectType": "nextjs",
  "nodeVersion": ">=18.18.0",
  "requiredGlobalDependencies": [
    {
      "name": "vercel",
      "installCommand": "npm install -g vercel"
    }
  ],
  "requiredEnvVars": [
    {
      "name": "OPENAI_API_KEY",
      "isPublic": false,
      "required": true
    },
    {
      "name": "SUPABASE_URL",
      "isPublic": false,
      "required": true
    },
    {
      "name": "SUPABASE_SERVICE_ROLE_KEY",
      "isPublic": false,
      "required": true
    },
    {
      "name": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "isPublic": true,
      "required": true
    },
    {
      "name": "BREVO_API_KEY",
      "isPublic": false,
      "required": true
    },
    {
      "name": "BREVO_SENDER_EMAIL",
      "isPublic": false,
      "required": true
    },
    {
      "name": "BREVO_SENDER_NAME",
      "isPublic": false,
      "required": true
    },
    {
      "name": "BASE_URL",
      "isPublic": false,
      "required": true,
      "development": "http://localhost:3000",
      "production": "https://{PROJECT_NAME}.vercel.app"
    }
  ],
  "setupSteps": [
    {
      "name": "verifyDependencies",
      "commands": [
        "node --version",
        "npm --version",
        "git --version",
        "vercel --version"
      ]
    },
    {
      "name": "vercelLogin",
      "commands": [
        "vercel login"
      ]
    },
    {
      "name": "gitSetup",
      "commands": [
        "git config --global user.name",
        "git config --global user.email"
      ]
    }
  ],
  "deploymentSteps": [
    {
      "name": "preDeploy",
      "commands": [
        "npm run build",
        "git add .",
        "git commit -m",
        "git push origin master"
      ]
    },
    {
      "name": "deploy",
      "commands": [
        "vercel --prod --yes"
      ]
    },
    {
      "name": "postDeploy",
      "commands": [
        "vercel logs"
      ]
    }
  ],
  "errorHandling": {
    "typeErrors": {
      "command": "npm run type-check",
      "resolution": "Fix type errors in the codebase"
    },
    "buildErrors": {
      "command": "vercel logs",
      "resolution": "Check build logs for specific errors"
    },
    "envErrors": {
      "command": "vercel env ls",
      "resolution": "Verify all environment variables are set"
    },
    "rollback": {
      "command": "vercel rollback",
      "resolution": "Revert to last working deployment"
    }
  },
  "monitoringCommands": {
    "buildLogs": "vercel logs",
    "deploymentList": "vercel ls",
    "envVars": "vercel env ls",
    "projectInfo": "vercel project ls"
  }
}
-->

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
   BASE_URL=your_base_url
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

<!-- AI-DEPLOYMENT-VALIDATION
{
  "preDeploymentChecks": [
    {
      "command": "npm run build",
      "expectedOutput": "success"
    },
    {
      "command": "npm run type-check",
      "expectedOutput": "no errors"
    },
    {
      "command": "verify-env-vars",
      "expectedOutput": "all present"
    }
  ],
  "requiredDependencies": [
    {
      "name": "vercel",
      "minVersion": "latest"
    },
    {
      "name": "git",
      "minVersion": "2.0.0"
    }
  ],
  "successCriteria": {
    "buildSuccess": {
      "condition": "exit code 0",
      "verification": "vercel logs"
    },
    "deploymentSuccess": {
      "condition": "deployment URL received",
      "verification": "vercel ls"
    },
    "logsAvailable": {
      "condition": "vercel logs accessible",
      "verification": "vercel logs"
    }
  },
  "postDeploymentChecks": [
    {
      "name": "environmentVariables",
      "command": "vercel env ls",
      "expectedOutput": "all variables present"
    },
    {
      "name": "buildLogs",
      "command": "vercel logs",
      "expectedOutput": "no errors"
    },
    {
      "name": "deployment",
      "command": "vercel ls",
      "expectedOutput": "deployment listed"
    }
  ]
}
-->
