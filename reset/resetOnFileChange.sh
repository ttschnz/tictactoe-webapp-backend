while true
    do inotifywait -qm --event modify --format '%w' web.env | docker-compose up -d
done