import cliProgress from 'cli-progress';
let i = 0;

const progressBar = new cliProgress.SingleBar(
  {
    format:
      'Recipes {bar} |' +
      '| {percentage}% || {value}/{total} recipes || Recipe: {recipe}'
    // barCompleteChar: '\u2588',
    // barIncompleteChar: '\u2591',
    // hideCursor: true
  },
  cliProgress.Presets.rect
);

progressBar.start(100, 0, {
  recipe: 'N/A'
});
const inter = setInterval(() => {
  i++;
  //   progressBar.increment();
  progressBar.update(i, {
    recipe: i
  });
  if (i >= 10) clearInterval(inter);
}, 1000);
