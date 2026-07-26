export function mergeAnswerIntoList(answersList = [], answer) {
  if (!answer) return answersList;

  const clientId = answer.client_id;
  let matched = false;
  const nextAnswers = answersList.map((item) => {
    const sameServerAnswer = String(item.id) === String(answer.id);
    const sameOptimisticAnswer = clientId != null && String(item.id) === String(clientId);

    if (!sameServerAnswer && !sameOptimisticAnswer) return item;

    matched = true;
    return { ...item, ...answer, id: answer.id };
  });

  return matched ? nextAnswers : [...answersList, answer];
}
