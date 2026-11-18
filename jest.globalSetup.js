// Fuso do Anderson (Cachoeirinha, RS). Os workers do Jest herdam esta variável,
// então os testes de data rodam iguais em qualquer máquina/CI.
module.exports = () => {
  process.env.TZ = 'America/Sao_Paulo';
};
