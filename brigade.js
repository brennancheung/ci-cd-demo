const { events, Job } = require('brigadier')

const registry = 'core.harbor.volgenic.com/ui'

events.on('check_suite:requested', async (e, project) => {
  const sendCheckStatus = (jobName, options = {}) => {
    console.log('Sending check status')
    // const checkRunImage = 'brigadecore/brigade-github-check-run:latest'
    // Local copy of image above to avoid network traffic and to speed up tests.
    const checkRunImage = `${registry}/report-check-status`

    const job = new Job(jobName, checkRunImage)
    const env = {
      CHECK_PAYLOAD: e.payload,
      CHECK_NAME: options.name,
      CHECK_TITLE: options.title,
      CHECK_SUMMARY: options.summary,
    }
    if (options.conclusion) env.CHECK_CONCLUSION = options.conclusion
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
  // Webhook event received
  console.log(`Received check_suite for commit ${e.revision.commit}`)

  // Run unit tests
  console.log('About to run unit tests')
  sendCheckStatus('start-run', {
    name: 'lint',
    title: 'Linting',
    summary: 'Starting lint tests',
  })

  try {
    const result = await createJob('jest-runner', 'hello-service', ['yarn jest']).run()
    sendCheckStatus('jest-results', {
      name: 'lint',
      title: 'Linting',
      summary: 'Linting succeeded',
      conclusion: 'success',
      text: result.toString(),
    })
  } catch (err) {
    sendCheckStatus('jest-results', {
      name: 'lint',
      title: 'Linting',
      summary: 'Linting failed',
      conclusion: 'failure',
      text: err,
    })
  }
})
