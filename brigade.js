const { events } = require('brigadier')

events.on('push', (e, project) => {
  console.log(`Received push for commit #{e.revision.commit}`)
})
