.PHONY: dev backend frontend install

# Run both backend and frontend concurrently
dev:
	npm run dev

# Run only the backend
backend:
	npm run backend

# Run only the frontend
frontend:
	npm run frontend

# Install dependencies for root, backend, and frontend
install:
	npm install
	npm install --prefix kksonline-backend-express
	npm install --prefix react-frontend
