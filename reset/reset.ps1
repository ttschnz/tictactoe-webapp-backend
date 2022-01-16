$tempval = docker compose ps -q
docker container kill $tempval
Remove-Item -r dbdata/*
docker compose up -d --build