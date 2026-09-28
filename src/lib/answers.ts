function normalize(value: string) {
  return value
    .trim()
    .replace(/[«»"'.,!?;:()[\]—–-]/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export function answersMatch(expected: string, given: string) {
  const answer = normalize(expected);
  const attempt = normalize(given);
  if (!answer || !attempt) {
    return false;
  }
  if (answer === attempt) {
    return true;
  }
  if (attempt.length >= 4 && answer.startsWith(attempt)) {
    return true;
  }
  if (answer.length >= 4 && attempt.startsWith(answer)) {
    return true;
  }
  return false;
}
