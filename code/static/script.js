const goto = (link) => {
        document.location.pathname = link;
    },
    joinGame = () => {
        alert("joining game");
    },

    showStatistics = () => {
        alert("showing statistics");
    },
    setCookie = (name, value, expiresUNIX) => {
        const d = new Date();
        d.setTime(expiresUNIX*1000);
        let expires = "expires=" + d.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    },

    logout = () => {
        setCookie("token", "", 0);
        document.location.reload();
    },
    browseGames = () => {
        alert("browsing games");
    };


class Game {
    constructor(gameId, gameKey, username, targetElmnt) {
        this.targetElmnt = targetElmnt;
        this.gameId = gameId;
        this.gameKey = gameKey;
        this.username = username;
        this.tiles = Array(3).fill(0).map(x => Array(3).fill(null));
        this._makeTiles();
    }

    async render() {
        this.lastState = await this.requestState();
        for(let i of this.lastState){
            console.log(i.movePosition);
            let x = i.movePosition%3;
            let y = Math.floor(i.movePosition/3);
            console.log({x,y});
            this.tiles[x][y].dataset.occupiedBy="x";
        }
    }

    _makeTiles(){
        for(let y in [0,1,2]){
            for(let x in [0,1,2]){
                this.tiles[x][y] = this._makeTile({x, y});
                this.targetElmnt.appendChild(this.tiles[x][y]);
            }
        }
    }

    _makeTile(coords){
        let tile = document.createElement("div");
        tile.classList.add("gameTile");
        tile.dataset.occupiedBy="false";
        tile.dataset.x=coords["x"];
        tile.dataset.y=coords["y"];
        tile.addEventListener("click", (()=>{
            if(tile.dataset.occupiedBy=="false"){
                console.log(coords)
                this.makeMove(Number(coords.x)+(Number(coords.y)*3));
                this.render();
            }
        }).bind(this))
        return tile;
    }

    makeMove(movePosition) {
        console.log("making move on movePosition", movePosition)
        return new Promise((resolve, reject) => {
            $.post("/makeMove", {
                gameId: this.gameId,
                gameKey: this.gameKey,
                username: this.username,
                movePosition
            }, result => {
                if (result.success) resolve(result.data);
                else reject("ERROR GETTING GAME-STATE");
            }, "json");
        })
    }

    requestState() {
        return new Promise((resolve, reject) => {
            $.post("/viewGame", {
                gameId: this.gameId
            }, result => {
                if (result.success) resolve(result.data);
                else reject("ERROR GETTING GAME-STATE");
            }, "json");
        })
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll("#signupForm").forEach((elmnt) => {
        elmnt.addEventListener("submit", (e) => {
            e.preventDefault(); // don't submit form
            // disable all buttons in form to prevent re-submission
            elmnt.querySelectorAll("button").forEach((button) => {
                button.setAttribute("disabled", "");
            });
            let username = elmnt.querySelector("[name='username']").value;
            let email = elmnt.querySelector("[name='email']").value;
            let password = elmnt.querySelector("[name='password']").value;

            let salt = forge.random.getBytesSync(128);
            // hexify bytes for easy implementation on server
            let key = forge.util.bytesToHex(forge.pkcs5.pbkdf2(password, salt, 12, 32));
            salt = forge.util.bytesToHex(salt);

            $.post("/signup", {
                username,
                email,
                key,
                salt
            }, response => {
                console.log("SERVERS RESPONSE TO SIGNUP: ", response);
                // re-enable buttons
                elmnt.querySelectorAll("button").forEach((button) => {
                    button.removeAttribute("disabled");
                });

                if (response.success) {
                    if (response.data.token) {
                        setCookie("token", response.data.token, response.data.token_expires);
                        goto("/");
                    } else {
                        goto("/signin");
                    }
                } else {
                    document.querySelector("#feedBackElement").innerHTML = "";
                    document.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));
                }
            }, "json").fail(() => {
                document.querySelector("#feedBackElement").innerHTML = "";
                document.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));

                // re-enable buttons
                elmnt.querySelectorAll("button").forEach((button) => {
                    button.removeAttribute("disabled");
                });
            });
        })
    });
    document.querySelectorAll("#signinForm").forEach((elmnt) => {
        elmnt.addEventListener("submit", (e) => {
            e.preventDefault(); // don't submit form
            // disable all buttons in form to prevent re-submission
            elmnt.querySelectorAll("button").forEach((button) => {
                button.setAttribute("disabled", "");
            });
            let username = elmnt.querySelector("[name='username']").value;
            let password = elmnt.querySelector("[name='password']").value;

            $.post("/getsalt", {
                username
            }, response => {
                console.log("SERVERS RESPONSE TO GETSALT: ", response);

                if (response.success) {
                    let salt = forge.util.hexToBytes(response.data);
                    let key = forge.util.bytesToHex(forge.pkcs5.pbkdf2(password, salt, 12, 32));

                    $.post("/login", {
                        username,
                        key
                    }, response => {
                        console.log("SERVERS RESPONSE TO LOGIN: ", response);
                        // re-enable buttons
                        elmnt.querySelectorAll("button").forEach((button) => {
                            button.removeAttribute("disabled");
                        });

                        if (response.success) {
                            setCookie("token", response.data.token, response.data.token_expires);
                            goto("/");
                        } else {
                            document.querySelector("#feedBackElement").innerHTML = "";
                            document.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));
                        }
                    }, "json").fail(() => {
                        document.querySelector("#feedBackElement").innerHTML = "";
                        document.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));

                        // re-enable buttons
                        elmnt.querySelectorAll("button").forEach((button) => {
                            button.removeAttribute("disabled");
                        });
                    });

                } else {
                    document.querySelector("#feedBackElement").innerHTML = "";
                    document.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));
                }
            }, "json").fail(() => {
                document.querySelector("#feedBackElement").innerHTML = "";
                document.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));

                // re-enable buttons
                elmnt.querySelectorAll("button").forEach((button) => {
                    button.removeAttribute("disabled");
                });
            });
        })
    });
    document.querySelectorAll("#gamecontainer").forEach((elmnt) => {
        let username = elmnt.dataset.username == "" ? false : elmnt.dataset.username;
        $.post("/startNewGame", {}, async response => {
            if (response.success) {
                let game = new Game(response.data.gameId, response.data.gameKey ?? false, username, elmnt);
                elmnt.game = game;
                await game.makeMove(0);
                await game.render();
            } else {
                console.error("error starting new game");
            }
        }, "json");
    });
});