.PHONY: build check clean deploy fmt help k3d-up logs status stop tunnel
.DEFAULT_GOAL := help

CLUSTER_NAME = tiny-myrmidon
PORT = 8080

define fail
	{ echo "\033[31m[ERROR]\033[0m $(1)"; exit 1; }
endef

build: ## Build minimal Alpine Docker images
	@docker info >/dev/null 2>&1 || \
		$(call fail,Docker is not running. Start Docker first.)
	@echo "==> Building API image (< 20 MB)..."
	@docker build -t tiny-myrmidon-api:v1 api/ || \
		$(call fail,Failed to build API image.)
	@echo "==> Building Game image..."
	@docker build -t tiny-myrmidon-game:v1 game/ || \
		$(call fail,Failed to build Game image.)

check: ## Run Rust, JavaScript, and Kubernetes checks
	@echo "==> Checking formatting..."
	@cd api && cargo fmt --all -- --check || \
		$(call fail,Run 'make fmt' to fix formatting.)
	@echo "==> Running Clippy..."
	@cd api && cargo clippy --all-targets -- -D warnings || \
		$(call fail,Fix Clippy warnings above.)
	@echo "==> Running tests..."
	@cd api && cargo test --all || \
		$(call fail,API tests failed.)
	@echo "==> Checking frontend JavaScript syntax..."
	@for script in game/js/*.js; do \
		node --input-type=module --check < "$script" || exit 1; \
	done || $(call fail,Frontend JavaScript syntax check failed.)
	@echo "==> Validating Kubernetes manifests..."
	@python3 -c "import yaml; \
		docs = list(yaml.safe_load_all(open('k8s/app.yaml'))); \
		assert docs and all('apiVersion' in d and 'kind' in d and 'name' in d.get('metadata', {}) for d in docs)" || \
		$(call fail,Invalid k8s/app.yaml.)
	@echo "All quality checks passed!"

clean: ## Delete k3d cluster, Docker images, and Rust build cache
	@echo "==> Cleaning up cluster, images, and build artifacts..."
	-@k3d cluster delete $(CLUSTER_NAME) 2>/dev/null || true
	-@docker rmi tiny-myrmidon-api:v1 tiny-myrmidon-game:v1 2>/dev/null || true
	@cd api && cargo clean

deploy: build k3d-up ## Build, import images and deploy to Kubernetes
	@echo "==> Importing images to k3d..."
	@k3d image import tiny-myrmidon-api:v1 tiny-myrmidon-game:v1 -c $(CLUSTER_NAME) || \
		$(call fail,Failed to import images.)
	@echo "==> Applying Kubernetes manifests..."
	@kubectl apply -f k8s/app.yaml || \
		$(call fail,Failed to apply k8s/app.yaml.)
	@kubectl rollout restart deployment/tiny-myrmidon-api deployment/tiny-myrmidon-game >/dev/null || \
		$(call fail,Failed to restart deployments.)
	@echo "==> Waiting for deployment rollout..."
	@kubectl rollout status deployment/tiny-myrmidon-api --timeout=60s || \
		$(call fail,API pod failed to start. Run 'make logs'.)
	@kubectl rollout status deployment/tiny-myrmidon-game --timeout=60s || \
		$(call fail,Game pod failed to start.)
	@kubectl get pods

fmt: ## Auto-format code
	@cd api && cargo fmt --all

help: ## Show this help message
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

k3d-up:
	@k3d cluster list $(CLUSTER_NAME) >/dev/null 2>&1 || \
		k3d cluster create $(CLUSTER_NAME) --port "$(PORT):80@loadbalancer" || \
		$(call fail,Failed to create k3d cluster.)
	@k3d cluster start $(CLUSTER_NAME) >/dev/null 2>&1 || \
		$(call fail,Failed to start k3d cluster.)

logs: ## Stream live logs from the API pod in Kubernetes
	@kubectl cluster-info >/dev/null 2>&1 || \
		$(call fail,Cluster is stopped. Run 'make deploy' first.)
	@kubectl logs -l app=tiny-myrmidon-api -f

status: ## Inspect cluster pods, services, and ingress
	@kubectl cluster-info >/dev/null 2>&1 || \
		$(call fail,Cluster is stopped. Run 'make deploy' first.)
	@echo "--- PODS ---"
	@kubectl get pods -o wide
	@echo "\n--- SERVICES ---"
	@kubectl get svc
	@echo "\n--- INGRESS ---"
	@kubectl get ingress

stop: ## Stop local k3d cluster without deleting it
	@echo "==> Stopping k3d cluster..."
	-@k3d cluster stop $(CLUSTER_NAME) 2>/dev/null || true

test: ## Run API tests
	@cd api && cargo test --all

tunnel: ## Expose game to mobile devices with instant QR code (Ctrl+C to stop)
	@bash scripts/tunnel.sh