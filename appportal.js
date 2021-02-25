const request = require('request-promise')
const cheerio = require('cheerio')
const xlsx = require('xlsx')

class Appportal {
  constructor(props = {}) {
    this.request = request.defaults({
      baseUrl: 'https://appportal/',
      jar: true,
      resolveWithFullResponse: true,
      rejectUnauthorized: false,
      followAllRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36' },
    })

    this.listPajakKeluaran = []
    this.listPajakMasukan = []

    this.listPajakKeluaranOk = true
    this.listPajakMasukanOk = true
    
    Object.assign(this, props)

    this.isLoggedIn = false
    this.hasPkpmAccess = false
    this.tanggalAkses = new Date()
  }

  isCompleted() {
    return this.listPajakKeluaranOk && this.listPajakMasukanOk
  }

  async login({ username, password }, cb) {
    try {
      const form = { username, password, sublogin: 'Login' }
      const res = await this.request.post('/login/login/loging_simpel', { form })

      if (res.request.uri.pathname !== '/login/login/loging_simpel') this.isLoggedIn = true

      if (typeof cb === 'function') return cb()
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async logout(cb) {
    try {
      await this.request.get('/portal/logout.php')
      this.isLoggedIn = false
      this.hasPkpmAccess = false
      if (typeof cb === 'function') return cb()
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async checkPkpmAccess(cb) {
    try {
      const res = await this.request.get('/pkpm')
      this.hasPkpmAccess = !res.body.match(/akses_out\.php/)

      if (typeof cb === 'function') return cb()
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async _getQ(npwp) {
    try {
      const qs = { p1: npwp }
      const res = await this.request.get('/pkpm/mfwpdetil.php', { qs })
      const { q } = res.body.match(/value="(?<q>\w+)" id="q"/).groups
      return q
    } catch (err) {
      throw err
    }
  }

  async _getDataPKPM(qs, data = []) {
    try {
      const res = await this.request.get('/pkpm/datapkpmlawan.php', { qs })
      const $ = cheerio.load(res.body)

      const paging = $('#paging').text().trim()
      const { totalPages } = paging.match(/(?<totalPages>\d+)\s+Page/).groups      
      
      const keys = [
        'NO',
        'NO FAKTUR',
        'TGL FAKTUR',
        'MASA PAJAK SENDIRI',
        'MASA PAJAK LAWAN',
        'NPWP LAWAN',
        'NAMA LAWAN',
        'PPN DILAPORKAN WP SENDIRI',
        'PPN DILAPORKAN LAWAN',
      ]

      const rows = $('#tbdatapkpm > tbody > tr')
      for (let i = 0; i < rows.length; i++) {
        const cols = $(rows.get(i)).children()
        
        const datum = {}
        for (let j = 0; j < keys.length; j++) {
          const key = keys[j]
          const value = $(cols.get(j + 1)).text().trim()

          datum[key] = j < keys.length - 2 ? value : +value.replace(/\./g, '')
        }
        
        data.push(datum)
      }

      if (qs.Page == totalPages) return data

      qs.Page++
      return this._getDataPKPM(qs, data)
    } catch (err) {
      throw err
    }
  }

  _getPkpmForReport(pkpm) {
   return pkpm.map(({ tahun, data }) => {
     let ppnLaporSendiri = 0, ppnLaporLawan = 0
          
     data.forEach(datum => {
       ppnLaporSendiri += datum['PPN DILAPORKAN WP SENDIRI']
       ppnLaporLawan += datum['PPN DILAPORKAN LAWAN']
     })
  
     return {
       tahun,
       ppnLaporSendiri: ppnLaporSendiri.toLocaleString('id'),
       ppnLaporLawan: ppnLaporLawan.toLocaleString('id'),
     }
   })
  }

  async getPKPM(npwp, listTahun = [new Date().getFullYear()], cb) {
    try {
      const listPajakKeluaran = this.listPajakKeluaran
      const listPajakMasukan = this.listPajakMasukan
      
      const q = await this._getQ(npwp)
      
      for (const tahun of listTahun) {
        
        const qs = { q, tahun, pilihcek: 1, bulan1: 1, bulan2: 12, nplawan: 0, Page: 1 }
        const [dataPK, dataPM] = await Promise.all(['PK', 'PM'].map(pilihcari => this._getDataPKPM({ ...qs, pilihcari })))
        
        const pk = { tahun, data: dataPK }
        const pm = { tahun, data: dataPM }

        listPajakKeluaran.push(pk)
        listPajakMasukan.push(pm)
      }

      if (typeof cb === 'function') return cb()
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  exportPkpmToExcel(path) {
    const wb = xlsx.utils.book_new()

    for (const pk of this.listPK) {
      const ws = xlsx.utils.json_to_sheet(pk.data)
      xlsx.utils.book_append_sheet(wb, ws, 'PK ' + pk.tahun)
    }

    for (const pm of this.listPM) {
      const ws = xlsx.utils.json_to_sheet(pm.data)
      xlsx.utils.book_append_sheet(wb, ws, 'PM ' + pm.tahun)
    }

    xlsx.writeFile(wb, path)
  }
}

module.exports = Appportal