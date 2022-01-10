from flask import Flask, render_template, request

# initialize flask application with template_folder pointed to public_html (relative to this file)
app=Flask(__name__, template_folder="../public_html/")

# on what paths to reply
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/success", methods=["POST"])
def success():
    return render_template("success.html")

# only debug if not as module
if __name__ == "__main__":
    app.debug = True
    app.run(host="0.0.0.0")