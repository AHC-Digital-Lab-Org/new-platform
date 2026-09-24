import * as service from './ecogestos.service.js';

export const list = async (req, res) => {
  res.json(await service.listProducts(req.valid.query));
};

export const getById = async (req, res) => {
  res.json(await service.getProduct(req.valid.params.id));
};

export const create = async (req, res) => {
  res.status(201).json(await service.createProduct(req.valid.body));
};
