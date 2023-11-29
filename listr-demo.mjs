import { color, Listr, ListrDefaultRendererLogLevels } from 'listr2'

const tasks = new Listr(
  [
    {
      title: 'This task will execute.',
      task: (ctx, task) => {
        task.output = 'Some data output.'
        task.output = 'Some data output 2.'
      },
      rendererOptions: { persistentOutput: true, outputBar: Infinity }
    }
  ],
  {
    rendererOptions: {
      icon: {
        [ListrDefaultRendererLogLevels.COMPLETED]: 'hey completed!'
      },
      color: {
        [ListrDefaultRendererLogLevels.COMPLETED]: (data) => color.bgGreen(color.black(data)),
        [ListrDefaultRendererLogLevels.OUTPUT]: color.cyan
      }
    }
  }
)

await tasks.run()