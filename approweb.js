const puppeteer = require('puppeteer-core')

class Approweb {
  constructor(username, password, npwp, { executablePath = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless = true } = {}, cb) {
    this.tanggalAkses = new Date()
    this.npwp = npwp
    return this.init(username, password, { executablePath, headless }, cb)
  }

  async init(username, password, { executablePath, headless }, cb) {
    try {
      this.browser = await puppeteer.launch({
        executablePath,
        ignoreHTTPSErrors: true,
        defaultViewport: null,
        headless,
        devtools: true,
        args: ['--start-maximized',]
      })
      this.page = await this.browser.newPage()
      await this.page.goto('https://approweb.intranet.pajak.go.id/', { waitUntil: 'networkidle2' })
      return this.login(username, password, cb)
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async login(username, password, cb) {
    try {
      await this.page.type('#LoginForm_ip', username, { delay: 25 })
      await this.page.type('#LoginForm_kataSandi', password, { delay: 25 })
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
        this.page.click('#yw0 button'),
      ])
      if (await this.page.$eval('.modal-title', e => e.textContent.trim()) !== 'Informasi') {
        throw new Error('Username atau Password Salah')
      }
      return this.setWp(cb)
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async logout(cb) {
    try {
      await this.page.goto('https://approweb.intranet.pajak.go.id/index.php?r=home/logout', { waitUntil: 'networkidle2' })
      await this.page.close()
      await this.browser.close()
      if (typeof cb === 'function') return cb()
      return this
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async setWp(cb) {
    try {
      await this.page.goto('https://approweb.intranet.pajak.go.id/index.php?r=home/cariWP')
      await this.page.type('#carinpwpmodelkatacari', this.npwp)
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
        this.page.click('[name="yt0"]'),
      ])
      if (!await this.page.$('table')) {
        throw new Error('NPWP salah.')
      }
      await Promise.all([
        this.page.waitForSelector('#favonclick', { visible: true }),
        this.page.click('table > tbody > tr > td:nth-child(2) > a'),
      ])
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
        this.page.click('[value="Buka profil"]'),
      ])
      if (typeof cb === 'function') return cb(null, this)
      return this
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async getSp2dk() {
    try {
      await this.page.goto('https://approweb.intranet.pajak.go.id/index.php?r=pemantauan/daftarsp2dk')
      const sp2dk = await this.page.$$eval('#daftarsp2dk>tbody>tr', es => es.map(e => {
        const cells = e.children
        return {
          nomor: cells.item(0).textContent.trim(),
          nomorLhpt: cells.item(1).textContent.trim(),
          tanggalLhpt: cells.item(2).textContent.trim(),
          nomorSp2dk: cells.item(3).textContent.trim(),
          tanggalSp2dk: cells.item(4).textContent.trim(),
          tahunPajak: cells.item(5).textContent.trim(),
          potensiAwal: cells.item(6).textContent.trim().replace(/,/g, '.'),
          nomorLhp2dk: cells.item(7).textContent.trim(),
          tanggalLhp2dk: cells.item(8).textContent.trim(),
          keputusan: cells.item(9).textContent.trim(),
          kesimpulan: cells.item(10).textContent.trim(),
          potensiAkhir: cells.item(11).textContent.trim().replace(/,/g, '.'),
          nilai: cells.item(12).textContent.trim().replace(/,/g, '.'),
          status: cells.item(13).textContent.trim(),
        }
      }))
      if (typeof cb === 'function') return cb(null, sp2dk)
      return sp2dk
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }
}

module.exports = Approweb