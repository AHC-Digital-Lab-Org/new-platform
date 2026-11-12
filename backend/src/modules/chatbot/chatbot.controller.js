import * as service from './chatbot.service.js';

export const ask = async (req, res) => {
  const { question, history, locale } = req.valid.body;
  res.json(await service.ask(question, { history, locale }));
};
