const cf = require('cloudflare')({
  token: process.env.TOKEN
  // Cloudflare token: https://dash.cloudflare.com/profile/api-tokens
  // Permissions: read zone, edit dns
})
const http = require('https')

const timeout = 10 // in seconds
const zoneName = process.env.ZONE || '' // Domain name. Example: lyo.su
const domainName = process.env.DOMAIN || '' // Subdomain name. Example: sub.lyo.su
let lastIP = '0.0.0.0'

const getMyIP = new Promise((resolve) => {
  http.get('https://api.ipify.org/', function (resp) {
    resp.on('data', (ip) => {
      resolve(ip.toString())
    })
  })
})

setInterval(async () => {
  const myIP = await getMyIP
  if (myIP !== lastIP) {
    console.log('new IP:', myIP)

    const zonesBrowse = await cf.zones.browse().catch((error) => {
      console.error(error.response.body)
    })

    zonesBrowse.result.forEach(async (zone) => {
      if (zone.name === zoneName) {
        const dnsBrowse = await cf.dnsRecords.browse(zone.id)

        dnsBrowse.result.forEach(async (dns) => {
          if (dns.name === domainName && myIP !== dns.content) {
            const dnsRecordNew = await cf.dnsRecords.edit(zone.id, dns.id, {
              content: myIP,
              type: 'A',
              proxied: true,
              name: domainName
            }).catch((error) => {
              console.error(error.response.body)
            })

            console.log('DNS update:', dnsRecordNew.result)
          }
        })
      }
    })
    lastIP = myIP
  }
}, timeout * 1000)
