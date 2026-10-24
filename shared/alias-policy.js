const PROHIBITED_WORDS = new Set([
  'asshole',
  'bastard',
  'bitch',
  'cabron',
  'cabrona',
  'coño',
  'cunt',
  'damn',
  'dick',
  'fuck',
  'fucker',
  'gilipollas',
  'hijoputa',
  'idiota',
  'imbecil',
  'joder',
  'mierda',
  'motherfucker',
  'pendejo',
  'pendeja',
  'puta',
  'puto',
  'shit',
  'slut',
  'whore',
]);

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const isAliasAllowed = (alias) => {
  const normalized = normalize(alias);
  const words = normalized.split(/\s+/);

  return ![...PROHIBITED_WORDS].some((word) => {
    if (words.includes(word)) return true;
    const separatedLetters = word.split('').join('\\s*');
    return new RegExp(`(?:^|\\s)${separatedLetters}(?:$|\\s)`).test(
      normalized,
    );
  });
};

export const ALIAS_POLICY_MESSAGE =
  'El alias contiene una palabra no permitida. Elige otro alias.';
