# download release from https://github.com/ttschnz/tictactoe_react/releases/latest
wget https://github.com/ttschnz/tictactoe_react/releases/latest/download/release.zip
# install unzip
apt-get install unzip
# unzip release.zip
unzip release.zip
# remove release.zip
rm release.zip
# run the server
python /code/main.py