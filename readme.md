# TicTacToe Webapp
In diesem Projekt wird ein Reinforcementlearning-Algorithmus (RL-A) ([wikipedia](https://en.wikipedia.org/wiki/Reinforcement_learning)) in einem Web-App implementiert. Technologien, die dazu verwendet wurden sind:
- Flask
    - SQLAlchemy (Verbindung zur Datenbank)
    - pycrypto (Benutzer-Management)
    - gevent (Web-Server)
    - numpy
    - typescript-compiler (TSC)
- PostgreSQL
- Docker
    - docker-compose
## Aufbau
Die Datenbank, mit PostgreSQL, wird in einem Docker-Container gestartet, im selben virtuellen Netzwerk ebenfalls ein Container mit dem Flask-Server. Dieser dient vor allem als API zu der Datenbank (mit `/api`-präfix), gibt aber auch einige statische Dateien zurück, die zum aufbau der Web-App gebraucht werden. 

Während dem Starten des Webservers, wird die Verbindung zu der Datenbank in einem gewissen Intervall überprüft, bis die Verbindung hergestellt werden kann. Sobald die Verbindung hergestellt wurde, werden die mit Sqlalchemy definierten Tabellen erstellt, danach antwortet der Server auf Anfragen von aussen.

Während dem Start kompilliert der Server die TypeScript Dateien im Ordner `code/static` zu browserfähigen JavaScript-Dateien (ES2017), mit der eingebauten [History-API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) wird die Webseite zu einer Web-App, sodass die Seite nicht auf Änderungen im URL reagiert, sondern dann nur die Webseite anpasst.

Die Daten der Datenbank werden im Ordner `dbData` gespeichert, im Ordner `dbInit` sind die Initialisierungsskripte für die Datenbank aufzufinden.
Im Ordner `reset` finden Sie skripte, die den Server updaten und zurücksetzen.
`code/main.py` ist der Entrypoint der Flask-Applikation.

## Installation
Die einzige Software, die für das Starten dieser Applikation notwendig ist, ist Docker. Selbstverständlich kann die Applikation auch ausserhalb von Docker gestartet werden, was aber mit zusätzlichem Aufwand verbunden ist.

1. Installiere Docker (wenn nicht vorhanden)
2. Starte Containers `docker-compose up -d --build` oder `docker compose up -d --build`
3. logs `docker-compose logs -f`

Im Browser wird unter dem Port :80 eine Webseite angezeigt.

### SSL
Für die SSL-Verschlüsslung kann in der Datei `web.env` Einstellungen angepasst werden. Ich empfiehle die Benutzung des `certbots` für die Einrichtung der Zertifikate. Dazu der Anleitung auf [eff.org](https://certbot.eff.org/instructions) folgen.

Als Root-Ordner für die ACME-Challenges kann der Pfad des Projekts angegeben werden, danach sollten Sie der Ordner, indem die Zertifikate sich befinden sowie die domain in der Datei `web.env` angeben sowie `ENABLE_SSL` auf `TRUE` setzen.
 
