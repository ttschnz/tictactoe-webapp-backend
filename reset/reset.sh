docker-compose rm -all
rm -rf dbdata/*
git pull
docker-compose build --no-cache
docker-compose up -d --build