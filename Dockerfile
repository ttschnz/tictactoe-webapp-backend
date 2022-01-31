FROM python:latest

# install flask
RUN pip install flask
# install db tool
RUN pip install -U Flask-SQLAlchemy
# install other dependencies
RUN pip install psycopg2-binary
# crypto library
RUN pip install pycrypto
# better server
RUN pip install gevent
# query result to json
RUN pip install SQLAlchemy-serializer
# prettify html before send
RUN pip install flask-pretty

CMD python /code/main.py
