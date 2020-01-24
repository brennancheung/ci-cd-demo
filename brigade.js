const { events, Job } = require('brigadier')

const registry = 'core.harbor.volgenic.com/ui'


events.on('check_suite:requested', (e, project) => {
  const sendCheckStatus = (jobName, summary = 'Beginning test run', conclusion, text) => {
    console.log('Sending check status')
    // This Check Run image handles updating GitHub
    // const checkRunImage = 'brigadecore/brigade-github-check-run:latest'

    // This image was pulled from Docker Hub and added to the local private registry to avoid
    // network latency and to make tests run faster.
    const checkRunImage = `${registry}/report-check-status`

    const job = new Job(jobName, checkRunImage)
    const env = {
      CHECK_PAYLOAD: e.payload,
      CHECK_NAME: 'tests',
      CHECK_TITLE: 'Tests',
      CHECK_SUMMARY: summary,
    }
    if (conclusion) env.CHECK_CONCLUSION = conclusion
    if (text) env.CHECK_TEXT = text
    job.imageForcePull = true
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
  // Webhook event received
  console.log(`Received check_suite for commit ${e.revision.commit}`)

  // Run unit tests
  console.log('About to run unit tests')
  sendCheckStatus('start-run')

  createJob('jest-runner', 'hello-service', ['yarn jest']).run()
    .then(result => sendCheckStatus('jest-results', 'Tests passed', 'success', result.toString()))
    .catch(err => sendCheckStatus('jest-results', 'Tests failed', 'failure', err))
})
