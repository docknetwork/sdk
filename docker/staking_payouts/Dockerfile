FROM node:16.6.0-buster AS builder
WORKDIR /usr/app

COPY . .

RUN yarn
RUN yarn build-scripts

FROM public.ecr.aws/lambda/nodejs:16

COPY --from=builder [ "/usr/app/build/*", "./" ]

CMD [ "staking_payouts.handler" ]
