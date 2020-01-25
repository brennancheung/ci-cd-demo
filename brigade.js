const { events, Job } = require('brigadier')
const { helpers } = require('./brigade/helpers')

events.on('check_suite:requested', async (e, project) => {
  const { createJob, runTest } = helpers(e, project)

  const lintJob = createJob('lint-runner', 'hello-service', ['yarn jest'])
  runTest('lint', 'Lint', lintJob)

  const unitTestsJob = createJob('unit-runner', 'hello-service', ['yarn jest'])
  runTest('unit', 'Unit', unitTestsJob)

  /*
  const maxParallelIntegration = 2
  for (let i=1; i<=maxParallelIntegration; i++) {
    const job = createJob(`cypress-${i}`, 'hello-service', ['yarn jest'])
    runTest(`cypress-${i}`, `Cypress ${i}`, job)
  }
  */
})
