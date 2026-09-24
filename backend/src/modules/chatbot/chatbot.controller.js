import * as service from './chatbot.service.js';

export const ask = async (req, res) => {
  res.json(await service.ask(req.valid.body.question));
};
