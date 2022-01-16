git pull
docker container kill $(docker-compose ps -q)
rm -rf dbdata/*
docker-compose up -d --build