# TicTacToe Webapp

In diesem Projekt wird ein Reinforcementlearning-Algorithmus (RL-A) ([wikipedia](https://en.wikipedia.org/wiki/Reinforcement_learning)) in einem Web-App implementiert. Technologien, die dazu verwendet wurden sind:

- Flask (Backend-Server)
  - SQLAlchemy (Verbindung zur Datenbank)
  - pycrypto (Benutzer-Management)
  - gevent (Web-Server)
  - numpy
- React (Frontend-Applikation)
  - yarn
  - [indexedDB](https://developer.mozilla.org/de/docs/Web/API/IndexedDB_API)
  - [localStroage](https://developer.mozilla.org/de/docs/Web/API/Window/localStorage)
  - [Node-Forge](https://github.com/digitalbazaar/forge)
- PostgreSQL (Backend-Datenbank)
- Docker (Virtualisierung)
  - docker-compose

## Aufbau

Die Datenbank (PostgreSQL) wird in einem Docker-Container gestartet, im selben virtuellen Netzwerk ebenfalls ein Container mit dem Flask-Server. Dieser dient vor allem als API zu der Datenbank, gibt aber auch statische Dateien zurück, die zum Aufbau der Web-App gebraucht werden.

Um Dinge zu vereinfachen, werden grundsätzlich alle `GET`-Requests statisch beantwortet und `POST`-Requests an die API weitergeleitet.

Zusätzlich steht ein pgadmin4 Container zur verfügung, mit dem die Datenbank mit einer grafischen Oberfläche auf port `:81` bearbeitet werden kann. Natürlich kann diese auch über den `psql` command erreicht werden: `docker-compose exec db psql -U postgres -d tictactoe`.

Wird der Flask-Container gestartet, wird zuerst die React-App gebuildet. Dies kann einige Zeit dauern, jedoch kann nach einem ersten Build die Umgebungsvariable `SKIPBUILD` auf `TRUE` gesetzt werden, um dies in Zukunft zu überspringen.

Ist der Build-Prozess fertig, wird die Verbindung zu der Datenbank in einem gewissen Intervall überprüft, bis die Verbindung hergestellt werden kann. Sobald die Verbindung hergestellt wurde, werden die mit Sqlalchemy definierten Tabellen erstellt, falls diese nicht bereits existieren. Danach antwortet der Server auf Anfragen von aussen.

Während dem Startprozess ist die Webseite nicht erreichbar, meist wird ein `Empty-Response`-Fehler angezeigt, da der Port von Docker bereits abgehört wird, aber die Applikation noch nicht antwortet.

Die Daten der Datenbank werden im Ordner `dbData` gespeichert, im Ordner `dbInit` sind die Initialisierungsskripte für die Datenbank aufzufinden (erstellung der Datenbank `tictactoe`).
Im Ordner `reset` finden Sie skripte, die den Server updaten und zurücksetzen.
`code/main.py` ist der Entrypoint der Flask-Applikation, jedoch wird diese über `code/run.sh` gestartet, da zuerst die React-App gebaut werden muss.

## Installation

Die einzige Software, die für das Starten dieser Applikation notwendig ist, ist Docker. Selbstverständlich kann die Applikation auch ausserhalb von Docker gestartet werden, was aber mit zusätzlichem Aufwand verbunden ist.

1. [Installieren von Docker (wenn nicht vorhanden)](https://docs.docker.com/engine/install/)
2. Starte Containers `docker-compose up -d --build` oder `docker compose up -d --build`
3. logs `docker-compose logs -f`

Im Browser wird unter dem Port :80 eine Webseite angezeigt.

### SSL

Für die SSL-Verschlüsslung kann in der Datei `web.env` Einstellungen angepasst werden. Ich empfiehle die Benutzung des `certbots` für die Einrichtung der Zertifikate. Dazu der Anleitung auf [eff.org](https://certbot.eff.org/instructions) folgen.

Als Root-Ordner für die ACME-Challenges kann der Pfad des Projekts angegeben werden, danach sollten Sie der Ordner, indem die Zertifikate sich befinden sowie die Domain in der Datei `web.env` angeben sowie `ENABLE_SSL` auf `TRUE` setzen.
