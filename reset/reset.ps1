docker-compose rm
Remove-Item -r dbdata/*
git pull
docker-compose build --no-cache
docker-compose up -d --force-recreate