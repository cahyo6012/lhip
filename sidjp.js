const request = require('request-promise')
const cheerio = require('cheerio')
const querystring = require('querystring')

function transposeArray(array = []) {
  return array[0].map((x, i) => array.map(x => x[i]))
}

function sortTahun(array = []) {
  for (let i = 0; i < array.length; i++) {
    array[i].sort((a, b) => a.tahun - b.tahun )
  }
}

class SIDJP {
  constructor(username, password, npwp, listTahun = [new Date().getFullYear()], cb) {
    this.jar = request.jar()
    this.request = request.defaults({
      baseUrl: 'http://sidjp:7777/',
      jar: this.jar,
      resolveWithFullResponse: true,
      rejectUnauthorized: false,
      followRedirect: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36' }
    })
    this.tanggalAkses = new Date()
    this.npwp = npwp
    this.listTahun = listTahun
    
    this.idCabang = ''

    this.profil = {}
    this.listSpt = []
    this.listPemegangSaham = []
    this.listPengurus = []
    this.listPenghasilan = []
    this.listPajakMasukan = []
    this.listPajakMasukanImpor = []
    this.listPajakKeluaran = []
    this.listEkspor = []
    this.listIkhtisarPembayaran = []
    this.listTunggakan = []

    return this.login(username, password, cb)
  }

  async _setWp(cb) {
    try {
      if (!this.npwp) throw new Error('NPWP tidak boleh kosong.')
      if (this.npwp.length !== 15) throw new Error('NPWP tidak valid.')

      const form = {
        nama: '',
        npwp1: this.npwp.slice(0,9),
        npwp2: this.npwp.slice(9,12),
        npwp3: this.npwp.slice(12),
        jenis_wp: 0,
        tahun_pajak: new Date().getFullYear(),
      }

      const res = await this.request.post('/SIDJP/rghasilcari_new', { form })
      const $ = cheerio.load(res.body)

      const anchor = $('table[width="95%"] a')
      if (!anchor.length) throw new Error('Tidak Ada Data')

      this.idCabang = anchor.attr('href').match(/\?idcabang=(?<idCabang>\d+)/).groups.idCabang

      if (typeof cb === 'function') return cb(null, this)
      return this
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async login(username, password, cb) {
    try {
      if (!username || !password) throw new Error('Username atau Password tidak boleh kosong.')
      const form = { i_1: username, i_2: password }
      const res = await this.request.post('/SIDJP/sipt_web.home', { form })
      if (res.body.match(/coba sekali lagi/)) throw new Error('Username atau Password salah.')

      await this._setWp()

      if (typeof cb === 'function') return cb(err, this)
      return this
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  logout(cb) {
    return this.request.get('/SIDJP/sipt_web.logout')
      .then(() => {
        if (typeof cb === 'function') return cb()
        return
      })
      .catch(err => {
        if (typeof cb === 'function') return cb(err)
        throw err
      })
  }

  async getProfil(cb) {
    try {
      const qs = {
        idcabang: this.idCabang,
        tahun: this.tanggalAkses.getFullYear(),
      }

      const res = await this.request.get('/SIDJP/rgProfileUtama', { qs })
      const $ = cheerio.load(res.body)

      const rows = $('table[width="90%"] table[width="100%"] tr')

      const profil = this.profil
      profil.npwp = $('td', rows.get(0)).last().text().trim()
      profil.namaWp = $('td', rows.get(1)).last().text().trim()
      profil.alamat = $('td', rows.get(2)).last().text().trim()
      profil.wargaNegara = $('td', rows.get(3)).last().text().trim()
      profil.telefon = $('td', rows.get(4)).last().text().trim()
      profil.email = $('td', rows.get(5)).last().text().trim()
      profil.tanggalDaftar = new Date($('td', rows.get(6)).last().text().trim()).toLocaleDateString('en-gb')
      profil.statusWp = $('td', rows.get(7)).last().text().trim()
      profil.tanggalPkp = new Date($('td', rows.get(8)).last().text().trim()).toLocaleDateString('en-gb')
      profil.kodeFaktur = $('td', rows.get(9)).last().text().trim()
      profil.tahunBuku = $('td', rows.get(10)).last().text().trim()
      profil.klu = $('td', rows.get(11)).last().text().trim()
      profil.kodeKlu = profil.klu.split(' ')[0]
      profil.namaKlu = profil.klu.split(' ').slice(1).join(' ')
      profil.kluPkp = $('td', rows.get(12)).last().text().trim()
      profil.kpp = $('td', rows.get(13)).last().text().trim()
      profil.jenisUsaha = $('td', rows.get(14)).last().text().trim()
      profil.statusHukum = $('td', rows.get(15)).last().text().trim()
      profil.statusModal = $('td', rows.get(16)).last().text().trim()
      profil.metodePerhitungan = $('td', rows.get(17)).last().text().trim()
      profil.metodePenyusutan = $('td', rows.get(18)).last().text().trim()
      profil.amortisasi = $('td', rows.get(19)).last().text().trim()
      profil.pembukuan = $('td', rows.get(20)).last().text().trim()
      profil.bahasaPembukuan = $('td', rows.get(21)).last().text().trim()
      profil.jumlahCabang = +$('td', rows.get(22)).last().text().trim()
      profil.penanggungJawab = $('td', rows.get(23)).last().text().trim()
      profil.juruSita = $('td', rows.get(24)).last().text().trim()

      if (typeof cb === 'function') cb(null, profil)
      return profil
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }
  
  async _getDetailSptLink() {
    try {
      const qs = {
        idcabang: this.idCabang,
        tahun: this.tanggalAkses.getFullYear()
      }

      const res = await this.request.get('/SIDJP/PPLSTSPT_MODV3', { qs })
      const $ = cheerio.load(res.body)
      const link = $('[name="frmdetillapor"]').attr('src')
      return link
    } catch (err) {
      throw err
    }
  }

  async _getDataSpt(link) {
    try {
      const res = await this.request.get(link)
      const $ = cheerio.load(res.body)
      
      const data = []

      $('table[align="center"] > tbody > tr')
        .filter(i => i)
        .each((i, tr) => {
          const cells = $(tr).children()

          const datum = {
            nomor: $(cells.get(0)).text().trim(),
            masa: $(cells.get(1)).text().trim(),
            tahun: $(cells.get(2)).text().trim(),
            pembetulan: $(cells.get(3)).text().trim(),
            bps: $(cells.get(4)).text().trim(),
            jenisSpt: $(cells.get(5)).text().trim(),
            nilai: $(cells.get(6)).text().trim(),
            tanggalLapor: $(cells.get(7)).text().trim(),
            tanggalBayar: $(cells.get(8)).text().trim(),
            asal: $(cells.get(9)).text().trim(),
            link: $('a', cells.get(4)).attr('href'),
          }

          switch (datum.jenisSpt) {
            case 'SPT Tahunan PPh Badan': datum.sptTahunan = true; break
            case 'SPT Masa PPh Pasal 25': datum.spt25 = true; break
            case 'SPT Masa PPh Pasal 21/26': datum.spt21 = true; break
            case 'SPT Masa PPh Pasal 22': datum.spt22 = true; break
            case 'SPT Masa PPh Pasal 23/26': datum.spt23 = true; break
            case 'SPT Masa PPh Pasal 4 ayat (2)': datum.spt42 = true; break
            case 'SPT Masa PPh Pasal 15': datum.spt15 = true; break
            case 'SPT Masa PPN dan PPnBM': datum.sptPpn = true; break
            case 'SPT Masa PPN Pemungut': datum.sptPpnPut = true; break
            case 'SPT Masa PPN Pedagang Eceran': datum.sptPpnDm = true; break
          }

          data.push(datum)
        })

      return data
    } catch (err) {
      throw err
    }
  }

  async getSpt(cb) {
    try {
      const link = await this._getDetailSptLink()
      const res = await this.request.get(link)
      const $ = cheerio.load(res.body)
      
      const anchors = $('table[cellpadding="5"] > tbody > tr').last().find('a')

      const listTahun = this.listTahun
      const listSpt = this.listSpt
      
      await Promise.all(listTahun.map(async tahun => {
        const anchor = anchors.filter((i, e) => $(e).text() == tahun)
        const link = '/SIDJP/pelayanan/' + anchor.attr('href')

        const data = await this._getDataSpt(link)

        listSpt.push({ tahun, empty: {}, data })
      }))

      listSpt.forEach(spt => {
        const { empty, data } = spt
        empty.sptTahunan = !data.filter(datum => datum.sptTahunan).length
        empty.spt25 = !data.filter(datum => datum.spt25).length
        empty.spt21 = !data.filter(datum => datum.spt21).length
        empty.spt22 = !data.filter(datum => datum.spt22).length
        empty.spt23 = !data.filter(datum => datum.spt23).length
        empty.spt42 = !data.filter(datum => datum.spt42).length
        empty.spt15 = !data.filter(datum => datum.spt15).length
        empty.sptPpn = !data.filter(datum => datum.sptPpn).length
        empty.sptPpnPut = !data.filter(datum => datum.sptPpnPut).length
        empty.sptPpnDm = !data.filter(datum => datum.sptPpnDm).length
      })
      
      sortTahun([listSpt])
      
      if (typeof cb === 'function') return cb(null, listSpt)
      return listSpt
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  _getLatestSpt(jenis) {
    const latestSpt = this.listSpt.map(spt => ({ tahun: spt.tahun, data: [] }))

    this.listSpt.forEach((spt, i) => spt.data
      .filter(datum => datum.jenisSpt === jenis)
      .forEach(datum => {
        const currentData = latestSpt[i].data

        const idx = currentData.findIndex(e => e.masa === datum.masa)
        if (idx === -1)
          return currentData.push(datum)
        else if (
          currentData[idx].pembetulan === 'Normal' ||
          currentData.pembetulan.match(/\d$/)[0] < datum.pembetulan.match(/\d$/)[0]
        ) return currentData[idx] = datum
      }))
    
    return latestSpt
  }

  async _getPemegangSahamDanPengurus(link) {
    try {
      const res = await this.request.get(link)
      const $ = cheerio.load(res.body)
      const rows = $('#AutoNumber1 > tbody > tr')

      const pemegangSaham = []
      
      let pengurusIndex = 0
      for (let i = 20; i < rows.length; i += 2) {
        const cols = $(rows.get(i)).children()
        
        if ($(cols.get(2)).text().trim() === 'JUMLAH BAGIAN A') {
          pengurusIndex = i + 6
          break
        }
        
        pemegangSaham.push({
          index: $(cols.get(1)).text().trim(),
          nama: $(cols.get(2)).text().trim(),
          alamat: $(cols.get(3)).text().trim(),
          npwp: $(cols.get(4)).text().trim(),
          modalRp: $(cols.get(5)).text().trim().replace(/,/g, '.'),
          modalPersen: $(cols.get(6)).text().trim() + '%',
          dividen: $(cols.get(7)).text().trim().replace(/,/g, '.'),
        })
      }

      const pengurus = []

      for (let i = pengurusIndex; i < rows.length - 8; i += 2) {
        const cols = $(rows.get(i)).children()
        
        if ($(cols.get(4)).text().trim().replace(/\D/g, '').length === 15) pengurus.push({
          index: $(cols.get(1)).text().trim(),
          npwp: $(cols.get(4)).text().trim(),
          nama: $(cols.get(2)).text().trim(),
          alamat: $(cols.get(3)).text().trim(),
          jabatan: $(cols.get(5)).text().trim(),
        })

        else pengurus.push({
          index: $(cols.get(1)).text().trim(),
          npwp: $(cols.get(2)).text().trim(),
          nama: $(cols.get(3)).text().trim(),
          alamat: $(cols.get(4)).text().trim(),
          jabatan: $(cols.get(5)).text().trim(),
        })
      }
      
      return { pemegangSaham, pengurus }
    } catch (err) {
      throw err
    }
  }

  async _getPenghasilan(link) {
    try {
      const res = await this.request.get(link)
      const $ = cheerio.load(res.body)
      const rows = $('#AutoNumber1 > tbody > tr')

      function format(text) {
        return text.replace(/\s/g, '').replace(/,/g, '.')
      }
      
      const penghasilan = {
        a: format($(rows.get(18)).children().last().prev().text().trim()),
        b: format($(rows.get(19)).children().last().prev().text().trim()),
        c: format($(rows.get(20)).children().last().prev().text().trim()),
        d: format($(rows.get(21)).children().last().prev().text().trim()),
        e: format($(rows.get(22)).children().last().prev().text().trim()),
        f: format($(rows.get(23)).children().last().prev().text().trim()),
        g: format($(rows.get(24)).children().last().prev().text().trim()),
        h: format($(rows.get(25)).children().last().prev().text().trim()),
        i: format($(rows.get(26)).children().last().prev().text().trim()),
        j: format($(rows.get(28)).children().last().prev().text().trim()),
      }

      return penghasilan
    } catch (err) {
      throw err
    }
  }

  async _openSpt(link) {
    return this.request.get(link)
      .then(resp => this.request.get(
        '/SIDJP/spt/' + resp.body.match(/(?<link>sidjp_spt.+)"/).groups.link
      ))
      .then(resp => this.request.get(
        '/SIDJP/spt/' + resp.body.match(/(?<link>sidjp_spt.+)"/).groups.link
      ))
      .then(resp => this.request.get(
        '/SIDJP/spt/' + resp.body.match(/(?<link>pp_screen_html.+)"/).groups.link
      ))
      .then(resp => {
        const $ = cheerio.load(resp.body)
        const link = $('[name="contents"]').attr('src')
        return this.request.get('/SIDJP/spt/' + link)
      })
      .catch(err => {
        console.log(err)
        throw err
      })
  }

  async _getDetailSptTahunan(datum) {
    try {
      const res = await this._openSpt(datum.link)

      const $ = cheerio.load(res.body)
      const linkLampiran5 = $('#AutoNumber1 > tbody > tr:nth-child(6) a').attr('href')
      const linkLampiran1 = $('#AutoNumber1 > tbody > tr:nth-child(2) a').attr('href')

      const [{ pemegangSaham, pengurus }, penghasilan] = await Promise.all([
        this._getPemegangSahamDanPengurus(linkLampiran5),
        this._getPenghasilan(linkLampiran1),
      ])

      return { pemegangSaham, pengurus, penghasilan }
    } catch (err) {
      throw err
    }
  }

  async getDetailSptTahunan(cb) {
    try {
      if (!this.listSpt.length) await this.getSpt()

      const latestSptTahunan = this._getLatestSpt('SPT Tahunan PPh Badan')

      const listPemegangSaham = this.listPemegangSaham
      const listPengurus = this.listPengurus
      const listPenghasilan = this.listPenghasilan

      await Promise.all(latestSptTahunan.map(async spt => {
        const { tahun } = spt
        
        const detailSptTahunan = await Promise.all(spt.data.map(datum => this._getDetailSptTahunan(datum)))

        const pemegangSaham = { tahun, data: [] }
        const pengurus = { tahun, data: [] }
        const penghasilan = { tahun, data: {} }

        detailSptTahunan.forEach(e => {
          pemegangSaham.data.push(...e.pemegangSaham)
          pengurus.data.push(...e.pengurus)
          penghasilan.data = e.penghasilan
        })

        listPemegangSaham.push(pemegangSaham)
        listPengurus.push(pengurus)
        listPenghasilan.push(penghasilan)
      }))

      sortTahun([listPemegangSaham, listPengurus, listPenghasilan])
      const result = { listPemegangSaham, listPengurus, listPenghasilan }
      
      if (typeof cb === 'function') return cb(null, result)
      return result
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async _getDataDetailSptPpn(link, type, masa) {
    try {
      const res = await this.request.get(link)
      const $ = cheerio.load(res.body)
      
      const data = []

      if (type === 'pm' || type === 'pk') {
        const jumlah = {
          nomor: '',
          nama: 'MASA ' + masa,
          npwp: '',
          kodeFaktur: '',
          tanggalFaktur: '',
          dpp: 0,
          ppn: 0,
          ppnbm: 0,
        }
  
        data.push(jumlah)
  
        const rows = $('table:nth-child(3) > tbody > tr')
        for (let i = 2; i < rows.length - 2; i++) {
          const cols = $(rows.get(i)).children()
          
          const dpp = +$(cols.get(5)).text().trim().replace(/,/g, '')
          const ppn = +$(cols.get(6)).text().trim().replace(/,/g, '')
          const ppnbm = +$(cols.get(7)).text().trim().replace(/,/g, '')
          
          jumlah.dpp += dpp
          jumlah.ppn += ppn
          jumlah.ppnbm += ppnbm
  
          data.push({
            nomor: $(cols.get(0)).text().trim(),
            nama: $(cols.get(1)).text().trim(),
            npwp: $(cols.get(2)).text().trim(),
            kodeFaktur: $(cols.get(3)).text().trim(),
            tanggalFaktur: $(cols.get(4)).text().trim(),
            dpp: dpp.toLocaleString('id'),
            ppn: ppn.toLocaleString('id'),
            ppnbm: ppnbm.toLocaleString('id'),
          })
        }
  
        jumlah.dpp = jumlah.dpp.toLocaleString('id')
        jumlah.ppn = jumlah.ppn.toLocaleString('id')
        jumlah.ppnbm = jumlah.ppnbm.toLocaleString('id')

        data.push({
          nomor: '',
          nama: '',
          npwp: '',
          kodeFaktur: '',
          tanggalFaktur: '',
          dpp: '',
          ppn: '',
          ppnbm: '',
        })
      } else if (type === 'pmImpor' || type === 'ekspor') {
        const jumlah = {
          nomor: '',
          nama: 'MASA ' + masa,
          nomorDokumen: '',
          tanggalDokumen: '',
          dpp: 0,
        }

        if (type === 'pmImpor') {
          jumlah.ppn = 0
          jumlah.ppnbm = 0
        }
  
        data.push(jumlah)
  
        const rows = $('table:nth-child(3) > tbody > tr')
        for (let i = 2; i < rows.length - 2; i++) {
          const cols = $(rows.get(i)).children()
          
          const dpp = +$(cols.get(4)).text().trim().replace(/,/g, '')
          jumlah.dpp += dpp
          
          let ppn, ppnbm
          if (type === 'pmImpor') {
            ppn = +$(cols.get(5)).text().trim().replace(/,/g, '')
            ppnbm = +$(cols.get(6)).text().trim().replace(/,/g, '')
            
            jumlah.ppn += ppn
            jumlah.ppnbm += ppnbm
          }
          
          data.push({
            nomor: $(cols.get(0)).text().trim(),
            nama: $(cols.get(1)).text().trim(),
            nomorDokumen: $(cols.get(2)).text().trim(),
            tanggalDokumen: $(cols.get(3)).text().trim(),
            dpp: dpp.toLocaleString('id'),
            ...(type === 'ppnImpor' ? {
              ppn: ppn.toLocaleString('id'),
              ppnbm: ppnbm.toLocaleString('id'),
            } : {}),
          })
        }
        
        jumlah.dpp = jumlah.dpp.toLocaleString('id')

        if (type === 'ppnImpor') {
          jumlah.ppn = jumlah.ppn.toLocaleString('id')
          jumlah.ppnbm = jumlah.ppnbm.toLocaleString('id')
        }

        data.push({
          nomor: '',
          nama: '',
          nomorDokumen: '',
          tanggalDokumen: '',
          dpp: '',
          ...(type === 'ppnImpor' ? {
            ppn: '',
            ppnbm: '',
          } : {}),
        })
      }

      return data
    } catch (err) {
      console.log(err)
      throw err
    }
  }

  async _getDetailSptPpn(datum) {
    try {
      const res = await this._openSpt(datum.link)

      const $ = cheerio.load(res.body)
      const linkPm = $('#AutoNumber1 > tbody > tr:nth-child(6) a').attr('href')
      const linkPmImpor = $('#AutoNumber1 > tbody > tr:nth-child(5) a').attr('href')
      const linkPk = $('#AutoNumber1 > tbody > tr:nth-child(4) a').attr('href')
      const linkEkspor = $('#AutoNumber1 > tbody > tr:nth-child(3) a').attr('href')

      const [pajakMasukan, pajakMasukanImpor, pajakKeluaran, ekspor] = await Promise.all([
        this._getDataDetailSptPpn(linkPm, 'pm', datum.masa),
        this._getDataDetailSptPpn(linkPmImpor, 'pmImpor', datum.masa),
        this._getDataDetailSptPpn(linkPk, 'pk', datum.masa),
        this._getDataDetailSptPpn(linkEkspor, 'ekspor', datum.masa),
      ])

      return { pajakMasukan, pajakMasukanImpor, pajakKeluaran, ekspor }
    } catch (err) {
      console.log(err)
      throw err
    }
  }

  async getDetailSptPpn(cb) {
    try {
      if (!this.listSpt.length) await this.getSpt()

      const latestSptPpn = this._getLatestSpt('SPT Masa PPN dan PPnBM')
      
      const listPajakMasukan = this.listPajakMasukan
      const listPajakMasukanImpor = this.listPajakMasukanImpor
      const listPajakKeluaran = this.listPajakKeluaran
      const listEkspor = this.listEkspor

      for (const spt of latestSptPpn) {
        const { tahun } = spt
  
        const dataPajakMasukan = []
        const dataPajakMasukanImpor = []
        const dataPajakKeluaran = []
        const dataEkspor = []

        for (const datum of spt.data) {
          const { pajakMasukan, pajakMasukanImpor, pajakKeluaran, ekspor } = await this._getDetailSptPpn(datum)

          dataPajakMasukan.push(...pajakMasukan)
          dataPajakMasukanImpor.push(...pajakMasukanImpor)
          dataPajakKeluaran.push(...pajakKeluaran)
          dataEkspor.push(...ekspor)
        }

        listPajakMasukan.push({
          tahun,
          data: dataPajakMasukan,
        })

        listPajakMasukanImpor.push({
          tahun,
          data: dataPajakMasukanImpor,
        })

        listPajakKeluaran.push({
          tahun,
          data: dataPajakKeluaran,
        })

        listEkspor.push({
          tahun,
          data: dataEkspor,
        })
      }

      sortTahun([listPajakMasukan, listPajakMasukanImpor, listPajakKeluaran, listEkspor])
      const result = { listPajakMasukan, listPajakMasukanImpor, listPajakKeluaran, listEkspor }
      
      if (typeof cb === 'function') return cb(null, result)
      return result
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async _getIkhtisarPembayaran(tahun) {
    try {
      const ikhtisarPembayaran = { tahun, keys: [], data: [] }
      
      const qs = { IDCABANG: this.idCabang, TAHUN: tahun }
      const res = await this.request.get('/SIDJP/BPLSTIKHTBYRIFR', { qs })
      
      const $ = cheerio.load(res.body)
      const rows = $('table[width="1600"] > tbody > tr')

      for (let i = 1; i < rows.length; i++) {
        const cols = $(rows.get(i)).children()
        
        ikhtisarPembayaran.keys.push($(cols.get(0)).text().trim())

        const data = []
        ikhtisarPembayaran.data.push(data)

        for (let j = 1; j <= 14; j++) {
          data.push($(cols.get(j)).text().trim().split('.')[0].replace(/,/g, '.'))
        }
      }

      ikhtisarPembayaran.data = transposeArray(ikhtisarPembayaran.data)

      return ikhtisarPembayaran
    } catch (err) {
      throw err
    }
  }

  async getIkhtisarPembayaran(cb) {
    try {
      const listIkhtisarPembayaran = this.listIkhtisarPembayaran

      const dataIkhtisarPembayaran = await Promise.all(this.listTahun.map(tahun => this._getIkhtisarPembayaran(tahun)))
      dataIkhtisarPembayaran.forEach(ikhtisarPembayaran => listIkhtisarPembayaran.push(ikhtisarPembayaran))

      if (typeof cb === 'function') return cb(null, listIkhtisarPembayaran)
      return listIkhtisarPembayaran
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }

  async _getTunggakan(tahun) {
    try {
      const tunggakan = { tahun, empty: false, data: [] }

      const qs = {
        idcabang: this.idCabang,
        idjnspjk: 0,
        masapjk: 999,
        tahun: tahun,
        tahun2: tahun,
        tgljttmp1: '',
        tgljttmp2: '',
        status: 'KURANG',
      }
      const res = await this.request.get('/SIDJP/kplsttunggakan', { qs })

      const $ = cheerio.load(res.body)
      const rows = $('table[width="95%"][align="center"] > tbody > tr')

      for (let i = 1; i < rows.length - 2; i++) {
        const row = $(rows.get(i))
        const cols = row.children()
        
        if (row.text().trim() === 'Data Tidak Ada') break

        tunggakan.data.push({
          index: i,
          nomorStpSkp: $(cols.get(1)).text().trim(),
          tanggalJatuhTempo: $(cols.get(2)).text().trim(),
          jenisPajak: $(cols.get(3)).text().trim(),
          masaTahunPajak: $(cols.get(4)).text().trim(),
          nilaiKetetapan: $(cols.get(5)).text().trim().split('.')[0].replace(/,/g, '.'),
          nilaiSetuju: $(cols.get(6)).text().trim().split('.')[0].replace(/,/g, '.'),
          nilaiBayar: $(cols.get(7)).text().trim().split('.')[0].replace(/,/g, '.'),
          saldoPiutang: $(cols.get(8)).text().trim().split('.')[0].replace(/,/g, '.'),
          status: $(cols.get(9)).text().trim(),
          inkrah: $(cols.get(10)).text().trim(),
          mataUang: $(cols.get(11)).text().trim(),
          tegur: $(cols.get(12)).text().trim(),
          paksa: $(cols.get(13)).text().trim(),
          sita: $(cols.get(14)).text().trim(),
        })
      }

      if (!tunggakan.data.length) tunggakan.empty = true

      return tunggakan
    } catch (err) {
      throw err
    }
  }

  async getTunggakan(cb) {
    try {
      const listTunggakan = this.listTunggakan

      const dataTunggakan = await Promise.all(this.listTahun.map(tahun => this._getTunggakan(tahun)))
      dataTunggakan.forEach(tunggakan => listTunggakan.push(tunggakan))

      if (typeof cb === 'function') return cb(null, listTunggakan)
      return listTunggakan      
    } catch (err) {
      if (typeof cb === 'function') return cb(err)
      throw err
    }
  }
}

module.exports = SIDJP