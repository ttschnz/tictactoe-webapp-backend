FROM nikolaik/python-nodejs:latest

RUN pip install setuptools
# install flask
RUN pip install flask
# install db tool
RUN pip install -U Flask-SQLAlchemy
# install other dependencies
RUN pip install psycopg2-binary
# crypto library
RUN pip install pycrypto
# better server
# RUN pip install gevent
RUN pip install tornado
# query result to json
RUN pip install SQLAlchemy-serializer
# prettify html before send
RUN pip install flask-pretty
# cronjobs
RUN pip install flask_apscheduler
# debugging
# RUN pip install traceback
# numpy for RL-A
RUN pip install numpy

RUN chmod +x /code/run.sh
CMD /code/run.sh
