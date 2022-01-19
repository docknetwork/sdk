FROM public.ecr.aws/lambda/nodejs:14

COPY [ "./build/scripts/staking_payouts.js", "." ]
COPY [ "yarn.lock", "package.json", "." ]
RUN npm i -g yarn
RUN yarn --production

CMD [ "staking_payouts.handler" ]
