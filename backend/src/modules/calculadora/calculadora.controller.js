import * as service from './calculadora.service.js';

export const calcular = (req, res) => {
  res.json(service.calcularHuella(req.valid.body));
};

export const calcularModulo = (req, res) => {
  const { general, datos } = req.valid.body;
  res.json(service.calcularModulo(req.valid.params.modulo, datos, general, 'body.datos'));
};

export const factores = (_req, res) => {
  res.json(service.obtenerCatalogo());
};
