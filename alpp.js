const request = require('request-promise')
const cheerio = require('cheerio')

class ALPP {
  constructor(props = {}) {
    this.request = request.defaults({
      baseUrl: 'https://10.245.2.84/alpp2',
      jar: true,
      resolveWithFullResponse: true,
      rejectUnauthorized: false,
      followRedirect: true,
      followAllRedirects: true,
      agentOptions: { secureProtocol: 'TLSv1_method' },
      headers: {
        'Host': '10.245.2.84',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
      },
    })
    
    this.listRiwayatPemeriksaan = []
    this.riwayatPemeriksaanOk = false
    
    Object.assign(this, props)

    this.isLoggedIn = false
    this.tanggalAkses = new Date()
  }

  isCompleted() {
    return this.riwayatPemeriksaanOk
  }

  async login({ username, password }, cb) {
    try {
      const form = { username, password }
      const res = await this.request.post('/proses.php', { form })

      if (res.request.uri.pathname !== '/alpp2/proses.php') this.isLoggedIn = true
      
      if (typeof cb === 'function') return cb()
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async logout(cb) {
    try {
      await this.request.get('/logoff.php')
      this.isLoggedIn = false
      if (typeof cb === 'function') return cb()
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async getRiwayatPemeriksaan(npwp, cb) {
    try {
      const listRiwayatPemeriksaan = this.listRiwayatPemeriksaan

      const qs = { module: 'riwayat' }
      const form = { kriteria: 1, cari: npwp }

      const res = await this.request.post('/main.php', { qs, form })
      const $ = cheerio.load(res.body)
      const rows = $('#example7 > tbody > tr')

      rows.each((i, row) => {

        const cols = $(row).children()
        listRiwayatPemeriksaan.push({
          index: i + 1,
          npwp: $(cols.get(0)).text().trim(),
          nama: $(cols.get(1)).text().trim(),
          masa: $(cols.get(2)).text().trim(),
          jenis: $(cols.get(3)).text().trim(),
          nomorSp2: $(cols.get(4)).text().trim(),
          tanggalSp2: $(cols.get(5)).text().trim().split('/').reverse().join('/'),
          nomorLhp: $(cols.get(6)).text().trim(),
          tanggalLhp: $(cols.get(7)).text().trim().split('/').reverse().join('/'),
        })
      })

      this.riwayatPemeriksaanOk = true
      
      return listRiwayatPemeriksaan
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }
}

module.exports = ALPP