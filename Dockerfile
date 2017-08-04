FROM node:alpine

RUN npm config set loglevel warn
RUN npm set progress=false
RUN npm install -g supper