CREATE DATABASE tictactoe;
\c tictactoe;

CREATE TABLE users(
    username VARCHAR(16) NOT NULL,
    email VARCHAR(256),
    PRIMARY KEY (username)
);

CREATE TABLE games(
    gameid SERIAL NOT NULL,
    attacker VARCHAR(16) REFERENCES users(username) NOT NULL,
    defender VARCHAR(16) REFERENCES users(username) NOT NULL,
    PRIMARY KEY (gameid)
);

CREATE TABLE moves(
    gameid INTEGER REFERENCES games,
    moveIndex INTEGER NOT NULL,
    movePosition INTEGER NOT NULL,
    PRIMARY KEY (gameid, moveIndex)
);