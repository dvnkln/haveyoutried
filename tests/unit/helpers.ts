import { GENERATORS, type GeneratorId } from '../../src/config';

/** Grundproduktion eines Generators laut Konfiguration (Tests rechnen damit statt mit festen Zahlen) */
export const prod = (id: GeneratorId) => GENERATORS.find((g) => g.id === id)!.baseProd;
