document.addEventListener('DOMContentLoaded', () => {
    console.log(forge);
    console.log(document.querySelectorAll("#signupForm"));
    document.querySelectorAll("#signupForm").forEach((elmnt) => {
        elmnt.addEventListener("submit", (e) => {
            e.preventDefault(); // don't submit form
            // disable all buttons in form to prevent re-submission
            elmnt.querySelectorAll("button").forEach((button)=>{
                button.setAttribute("disabled", "");
            });
            let username = elmnt.querySelector("[name='username']").value;
            let email = elmnt.querySelector("[name='email']").value;
            let password = elmnt.querySelector("[name='password']").value;

            let salt =  forge.random.getBytesSync(128);
            // hexify bytes for easy implementation on server
            let key = forge.util.bytesToHex(forge.pkcs5.pbkdf2(password, salt, 12, 32));
            salt = forge.util.bytesToHex(salt);

            $.post("/signup", {username, email, key, salt}, response=>{
                console.log("SERVERS RESPONSE TO SIGNUP: ", response);
                // re-enable buttons
                elmnt.querySelectorAll("button").forEach((button)=>{
                    button.removeAttribute("disabled");
                });

                if(response.success){
                    if (response.data.token){
                        setCookie("token", response.data.token)
                        goto("/");
                    }else{
                        goto("/signin");
                    }
                }else{
                    elmnt.querySelector("#feedBackElement").innerHTML="";
                    elmnt.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));    
                }
            }, "json").fail(()=>{
                elmnt.querySelector("#feedBackElement").innerHTML="";
                elmnt.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));

                // re-enable buttons
                elmnt.querySelectorAll("button").forEach((button)=>{
                    button.removeAttribute("disabled");
                });
            })
            ;
        })
    });
    document.querySelectorAll("#signinForm").forEach((elmnt) => {
        elmnt.addEventListener("submit", (e) => {
            e.preventDefault(); // don't submit form
            // disable all buttons in form to prevent re-submission
            elmnt.querySelectorAll("button").forEach((button)=>{
                button.setAttribute("disabled", "");
            });
            let username = elmnt.querySelector("[name='username']").value;
            let password = elmnt.querySelector("[name='password']").value;

            $.post("/getsalt", {username}, response=>{
                console.log("SERVERS RESPONSE TO GETSALT: ", response);

                if(response.success){
                    let salt = forge.util.hexToBytes(response.data);
                    let key = forge.util.bytesToHex(forge.pkcs5.pbkdf2(password, salt, 12, 32));

                    $.post("/login", {username, key}, response=>{
                        console.log("SERVERS RESPONSE TO LOGIN: ", response);
                        // re-enable buttons
                        elmnt.querySelectorAll("button").forEach((button)=>{
                            button.removeAttribute("disabled");
                        });
        
                        if(response.success){
                            setCookie("token", response.data.token, response.data.token_expires)
                            goto("/");
                        }else{
                            elmnt.querySelector("#feedBackElement").innerHTML="";
                            elmnt.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));    
                        }
                    }, "json").fail(()=>{
                        elmnt.querySelector("#feedBackElement").innerHTML="";
                        elmnt.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));
        
                        // re-enable buttons
                        elmnt.querySelectorAll("button").forEach((button)=>{
                            button.removeAttribute("disabled");
                        });
                    });

                }else{
                    elmnt.querySelector("#feedBackElement").innerHTML="";
                    elmnt.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));    
                }
            }, "json").fail(()=>{
                elmnt.querySelector("#feedBackElement").innerHTML="";
                elmnt.querySelector("#feedBackElement").appendChild(document.createTextNode("Error. Please check your entries or try again later."));

                // re-enable buttons
                elmnt.querySelectorAll("button").forEach((button)=>{
                    button.removeAttribute("disabled");
                });
            });
        })
    });
    window.goto=(link)=>{
        document.location.pathname = link;
    };
    window.startNewGame = () => {
        alert("starting new game");
    }

    window.showStatistics = () => {
        alert("showing statistics");
    }
    window.setCookie = (name, value)=>{
        const d = new Date();
        d.setTime(d.getTime() + (9999*24*60*60*1000));
        let expires = "expires="+ d.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
      }
});