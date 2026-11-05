const PROHIBITED_WORDS = new Set([
  'asshole',
  'bastard',
  'bitch',
  'cabron',
  'cabrona',
  'cono',
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

  return ![...PROHIBITED_WORDS].some((word) => {
    const separatedLetters = word.split('').join('\\s*');
    if (new RegExp(`(?:^|\\s)${separatedLetters}(?:$|\\s)`).test(normalized)) {
      return true;
    }
    if (word === 'cono') return false;

    let index = normalized.indexOf(word);
    while (index !== -1) {
      const prefix = normalized.slice(0, index);
      const suffix = normalized.slice(index + word.length);
      if (
        prefix.length <= 1 ||
        suffix.length <= 1 ||
        /\d/.test(prefix.at(-1) ?? '') ||
        /\d/.test(suffix[0] ?? '')
      ) {
        return true;
      }
      index = normalized.indexOf(word, index + 1);
    }
    return false;
  });
};

export const ALIAS_POLICY_MESSAGE =
  'El alias contiene una palabra no permitida. Elige otro alias.';
