.PHONY: start stop install build migrate cc logs shell db-shell

## Start the DDEV environment
start:
	ddev start

## Stop the DDEV environment
stop:
	ddev stop

## Install all dependencies (Composer + npm)
install:
	ddev composer install
	ddev npm install

## Build frontend assets (production)
build:
	ddev npm run build

## Build frontend assets with file watcher (development)
watch:
	ddev npm run watch

## Run Doctrine migrations
migrate:
	ddev exec php bin/console doctrine:migrations:migrate --no-interaction

## Clear Symfony cache
cc:
	ddev exec php bin/console cache:clear

## Tail application logs
logs:
	ddev exec tail -f var/log/dev.log

## Open a shell inside the DDEV web container
shell:
	ddev exec bash

## Open a MySQL shell to the DDEV database
db-shell:
	ddev mysql

## Fresh start: start DDEV, install deps, run migrations, build assets
setup: start install migrate build
	@echo ""
	@echo "✅  FastJsonRenderer is ready!"
	@ddev describe | grep -E "Primary|https"
