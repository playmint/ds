@echo off
@echo %1

if "%1%"=="easy" (
	docker-compose down -v
	docker-compose up
)

if "%1%"=="hard" (
	cd ../ds-contracts
	docker-compose down -v

	cd ../cog/services
	docker-compose down -v

	cd ../ds-unity
	docker-compose down -v

	docker compose \
		-f ../ds-contracts/docker-compose.yml \
		up --build
	)
