FROM node:12

WORKDIR /srv

COPY package.json .
COPY package-lock.json .

RUN npm install --silent

COPY . .

CMD [ "npm", "start" ]
