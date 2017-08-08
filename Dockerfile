FROM node:alpine

RUN npm config set loglevel warn
RUN npm set progress=false
RUN npm install -g supper

WORKDIR /app
COPY /test/sampleApp/package.json /app
COPY /test/sampleApp/server.js /app
RUN npm install
EXPOSE 3001

CMD supper --inspect=0.0.0.0:9299 -s -t -c -n error server.js