FROM python:latest
# install flask
RUN pip install flask

WORKDIR /app

CMD python ./code/main.py
