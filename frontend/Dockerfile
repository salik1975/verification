# Use official lightweight Node image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy only the package.json and lock file first to leverage cached Docker layers
COPY package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile || npm install

# Copy the rest of the application source code
COPY . .

# Expose the Vite dev server port
EXPOSE 5173

# Start the development server (accessible outside the container)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 