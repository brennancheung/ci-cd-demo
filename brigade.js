const { events, Job } = require('brigadier')

let registry = ''

events.on('check_suite:requested', async (e, project) => {
  // Webhook event received
  console.log(`Received check_suite for commit ${e.revision.commit}`)

  // The Docker container registry where we want to push / pull images are
  // saved in the 'project' context.
  registry = project.secrets.registry
  console.log(`Container registry set to: ${registry}`)

  console.log('event info:')
  console.log(JSON.stringify(e, null, 4))

  console.log('project info:')
  console.log(JSON.stringify(e, null, 4))

  console.log('payload info:')
  const payload = JSON.parse(e.payload)
  console.log(JSON.stringify(JSON.parse(e.payload), null, 4))

  const prNumber = payload.body.pull_requests[0].number
  const { commit, ref } = e.revision

  console.log(JSON.stringify({ prNumber, commit, ref }, null, 4))

  const sendCheckStatus = (stage, options = {}) => {
    // const checkRunImage = 'brigadecore/brigade-github-check-run:latest'
    // Local copy of image above to avoid network traffic and to speed up tests.
    const checkRunImage = `${registry}/report-check-status`

    const jobName = `${options.checkName}-${stage}`
    const job = new Job(jobName, checkRunImage)
    const env = {
      CHECK_PAYLOAD: e.payload,
      CHECK_NAME: options.checkName,
      CHECK_TITLE: options.title,
      CHECK_SUMMARY: options.summary,
    }
    const conclusionStages = ['success', 'failure']
    if (conclusionStages.includes(stage)) env.CHECK_CONCLUSION = stage
    if (options.text) env.CHECK_TEXT = options.text
    job.imageForcePull = false
    job.env = env
    job.streamLogs = false
    job.imagePullSecrets = ['regcred']
    return job.run()
  }

  const createJob = (name, image, tasks = []) => {
    const fullImage = `${registry}/${image}`
    const job = new Job(name, fullImage, tasks, true)
    job.streamLogs = true
    job.imagePullSecrets = ['regcred']
    job.imageForcePull = true
    return job
  }

  const runTest = async (checkName, title, job) => {
    const startMessage = `${title} test starting`
    const successMessage = `${title} test succeeded`
    const failMessage = `${title} test failed`
    sendCheckStatus('start', {
      checkName,
      title: startMessage,
      summary: startMessage
    })
    try {
      const results = await job.run()
      sendCheckStatus('success', {
        checkName,
        title: successMessage,
        summary: successMessage,
        text: results.toString(),
      })
    } catch (err) {
      sendCheckStatus('failure', {
        checkName,
        title: failMessage,
        summary: failMessage,
        text: err,
      })
    }
  } 

  const lintJob = createJob('lint-runner', 'hello-service', ['yarn jest'])
  runTest('lint', 'Lint', lintJob)

  const unitTestsJob = createJob('unit-runner', 'hello-service', ['yarn jest'])
  runTest('unit', 'Unit', unitTestsJob)

  const maxParallelIntegration = 2
  for (let i=1; i<=maxParallelIntegration; i++) {
    const job = createJob(`cypress-${i}`, 'hello-service', ['yarn jest'])
    runTest(`cypress-${i}`, `Cypress ${i}`, job)
  }
})
