if [ $1 = easy ]
then
	docker-compose down -v
	docker-compose up
fi

if [ $1 = hard ]
then
	cd ../ds-contracts
	docker-compose down -v

	cd ../cog/services
	docker-compose down -v

	cd ../ds-unity
	docker-compose down -v

	docker compose \
		-f ../ds-contracts/docker-compose.yml \
		up --build
fi
