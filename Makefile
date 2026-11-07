.PHONY: dev admin-dev backend frontend admin install admin-hash db-migrate db-status preflight smoke test test-backend test-admin build-admin lint-admin help

BACKEND = kksonline-backend-express
ADMIN   = admin-frontend

help:
	@echo "make install       install dependencies for all apps"
	@echo "make dev           run backend + storefront + admin together"
	@echo "make admin-dev     run backend + admin only (http://localhost:5174)"
	@echo "make admin         run only the admin app (needs the backend running)"
	@echo "make backend       run only the backend (http://localhost:5000)"
	@echo "make frontend      run only the storefront"
	@echo "make admin-hash    make a bcrypt hash for ADMIN_ACCOUNTS"
	@echo "make db-migrate    apply Prisma migrations to the Neon database in .env"
	@echo "make db-status     show migration status"
	@echo "make preflight     check .env, Neon, R2, Cloudflare (never prints secrets)"
	@echo "make smoke         end-to-end admin API smoke test"
	@echo "make test          backend + admin tests"
	@echo "make build-admin   production build of the admin app"

# Run backend, storefront and admin concurrently
dev:
	npm run dev

# Run only the backend + the admin dashboard
admin-dev:
	npx concurrently -n "backend,admin" -c "blue,magenta" "npm run dev --prefix $(BACKEND)" "npm run dev --prefix $(ADMIN)"

# Run only the backend
backend:
	npm run backend

# Run only the storefront
frontend:
	npm run frontend

# Run only the admin dashboard (http://localhost:5174, proxies /api to the backend on :5000)
admin:
	npm run admin

# Install dependencies for root, backend, storefront and admin
install:
	npm run install:all

# --- Admin setup and checks ---
admin-hash:
	npm run admin:hash --prefix $(BACKEND)

db-migrate:
	npm run db:migrate --prefix $(BACKEND)

db-status:
	npm run db:status --prefix $(BACKEND)

preflight:
	npm run preflight --prefix $(BACKEND)

smoke:
	npm run smoke:admin --prefix $(BACKEND)

# --- Tests and builds ---
test:
	npm test

test-backend:
	npm test --prefix $(BACKEND)

test-admin:
	npm test --prefix $(ADMIN)

lint-admin:
	npm run lint --prefix $(ADMIN)

build-admin:
	npm run build --prefix $(ADMIN)
