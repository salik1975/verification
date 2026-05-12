# Deployment & Configuration Update Summary

Below is a detailed breakdown of the changes made yesterday across IIS, environment files, and deployment workflows, along with recommendations.

---

## 1. IIS Configuration Updates

### ✔ Removed Incorrect Backend/Microservice Placement
Previously, the **api-backend** and **microservice** were deployed inside the frontend directory, which risked config conflicts.  
These were removed to avoid mis-configuration.

### ✔ Created Dedicated IIS Applications
Two new applications were created:

- **api-backend**
- **microservice**

Each now has its own directory containing a `config` folder for clarity and isolation.

### ✔ Updated Reverse Proxy Rules
Configured one clean reverse proxy rule per application:

- **microservice** → `http://localhost:8001`
- **api-backend** → `http://localhost:8002`  
  _(Previously misconfigured to port 8000 — this port should no longer be used.)_

---

## 2. Environment & Script Changes

### ✔ PM2 Startup Script Fixes
Updated both `run_pm2.bat` files:

- microservice → **8001**
- api-backend → **8002**

> **Note:** The RDP environment does not execute `.bat` files properly when double-clicked.  
> The command inside had to be run manually in the terminal.  
> The system issue needs to be debugged on your end.

### ✔ Backend Environment Correction
The backend was referencing an incorrect external microservice URL.  
This was updated to the correct internal microservice endpoint.

### ✔ Frontend `.env` and Build Fixes
- Cleaned up commented entries in `.env`.
- Adjusted Vite base path to match your deployment (frontend served from `/`).
- Fixed user creation routing issue due to root-level deployment:

**File:** `frontend/src/services/userService.ts`  
**Line:** 42

**Change:**
```diff
- USERS: '/api/v1/users',
+ USERS: '/api/v1/users/',
```

After applying these changes, the frontend was rebuilt and the updated dist folder was deployed to your frontend hosting directory.

---

## 3. Notes & Recommendations

### ⚠ Frontend IIS Root Deployment
The frontend is deployed at / (site root), and the IIS config contains extensive custom routing rules for REST API handling.
This complexity may create issues later.

Recommendation:
Review and clean up unnecessary routing rules. Keep only essential ones.

### ⚠ PM2 Restart Procedure
When updating the microservice or api-backend, always use:

```bash
pm2 delete <name>
pm2 start <script>
```

Avoid using:

```bash
pm2 restart <name>
```

as it can preserve stale processes or environment variables.