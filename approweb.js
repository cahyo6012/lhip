const puppeteer = require('puppeteer-core')

const _launchOptions = Symbol()
const _browser = Symbol()
const _page = Symbol()

class Approweb {
  constructor(props = {}, { executablePath = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless = true }) {
    this[_launchOptions] = { executablePath, headless}
    this[_browser] = null
    this[_page] = null

    this.listSp2dk = []
    this.listSp2dkOk = false
    
    Object.assign(this, props)
    
    this.isLoggedIn = false
    this.tanggalAkses = new Date()
  }

  isCompleted() {
    return this.listSp2dkOk
  }

  async init() {
    try {
      this[_browser] = await puppeteer.launch({
        ...this[_launchOptions],
        ignoreHTTPSErrors: true,
        defaultViewport: null,
        devtools: true,
        args: ['--start-maximized',]
      })
      this[_page] = await this[_browser].newPage()
      await this[_page].setRequestInterception(true)
      this[_page].on('request', req => {
        if (['document'].indexOf(req.resourceType()) !== -1) req.continue()
        else if (['script', 'xhr'].indexOf(req.resourceType()) !== -1 && /TSPD/.test(req.url())) req.continue()
        else req.abort()
      })
    } catch (err) {
      throw err
    }
  }

  async login({ username, password }, cb) {
    try {
      await this.init()
      
      await this[_page].goto('https://approweb.intranet.pajak.go.id/', { waitUntil: 'networkidle2' })
      
      await this[_page].type('#LoginForm_ip', username, { delay: 25 })
      await this[_page].type('#LoginForm_kataSandi', password, { delay: 25 })
      await Promise.all([
        this[_page].waitForNavigation({ waitUntil: 'networkidle2' }),
        this[_page].click('#yw0 button'),
      ])
      if (await this[_page].$eval('.modal-title', e => e.textContent.trim()) === 'Informasi') this.isLoggedIn = true
      
      if (typeof cb === 'function') return cb()
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      console.log(err)
      throw err
    }
  }

  async logout(cb) {
    try {
      await this[_page].goto('https://approweb.intranet.pajak.go.id/index.php?r=home/logout', { waitUntil: 'networkidle2' })
      await this[_page].close()
      await this[_browser].close()
      this.isLoggedIn = false
      if (typeof cb === 'function') return cb()
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async setWp(npwp, cb) {
    try {
      await this[_page].goto('https://approweb.intranet.pajak.go.id/index.php?r=home/cariWP')
      await this[_page].type('#carinpwpmodelkatacari', npwp)
      await Promise.all([
        this[_page].waitForNavigation({ waitUntil: 'networkidle2' }),
        this[_page].click('[name="yt0"]'),
      ])
      const isNpwpExist = await this[_page].evaluate(() => !!document.querySelectorAll('table').length)
      if (!isNpwpExist) {
        throw new Error('NPWP salah.')
      }
      await Promise.all([
        this[_page].waitForNavigation({ waitUntil: 'networkidle2' }),
        this[_page].$eval('#setNPWPForm', (form, npwp) => {
          form['CariWPForm[npwp]'].value = npwp
          form.submit()
        }, npwp),
      ])
      if (typeof cb === 'function') return cb()
      return
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async getSp2dk() {
    try {
      await this[_page].goto('https://approweb.intranet.pajak.go.id/index.php?r=pemantauan/daftarsp2dk')

      const listSp2dk = await this[_page].$$eval('#daftarsp2dk>tbody>tr',
        es => es.filter(e => e.textContent.trim() !== 'Tidak ada data yang tersedia pada tabel ini').map(e => {
          const cells = e.children
          return {
            nomor: cells[0].textContent.trim(),
            nomorLhpt: cells[1].textContent.trim(),
            tanggalLhpt: cells[2].textContent.trim(),
            nomorSp2dk: cells[3].textContent.trim(),
            tanggalSp2dk: cells[4].textContent.trim(),
            tahunPajak: cells[5].textContent.trim(),
            potensiAwal: cells[6].textContent.trim().replace(/,/g, '.'),
            nomorLhp2dk: cells[7].textContent.trim(),
            tanggalLhp2dk: cells[8].textContent.trim(),
            keputusan: cells[9].textContent.trim(),
            kesimpulan: cells[10].textContent.trim(),
            potensiAkhir: cells[11].textContent.trim().replace(/,/g, '.'),
            nilai: cells[12].textContent.trim().replace(/,/g, '.'),
            status: cells[13].textContent.trim(),
          }
        }
      ))

      this.listSp2dk = listSp2dk
      this.listSp2dkOk = true
      
      if (typeof cb === 'function') return cb()
      return
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }
}

module.exports = Approweb