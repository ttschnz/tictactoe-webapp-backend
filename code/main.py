# flask for serving files
from flask import Flask, render_template, request
# SQLAlchemy to access the database
from flask_sqlalchemy import SQLAlchemy
# we will use os to access envorinment variables stored in the *.env files
import os


# initialize flask application with template_folder pointed to public_html (relative to this file)
app=Flask(__name__)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True
app.config["SQLALCHEMY_DATABASE_URI"] =  f"postgresql://{os.environ['POSTGRES_USER']}:{os.environ['POSTGRES_PASSWORD']}@db/tictactoe"
db = SQLAlchemy(app)

class Data(db.Model):
    __tablename__ = "data"
    id=db.Column(db.Integer, primary_key=True)
    username_=db.Column(db.String(120), unique=True)
    def __init__(self, username_, password_):
        username_=username_
        password_=password_

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/success", methods=["POST"])
def success():
    db.session.add(Data(request.form["username"], request.form["password"]))
    db.session.commit()
    return render_template("success.html")

@app.route("/api/test", methods=["GET", "POST"])
def apiTest():
    return jsonify(request.form)

# only debug if not as module
if __name__ == "__main__":    
    app.debug = True
    app.run(host="0.0.0.0", port=os.environ["HTTP_PORT"])