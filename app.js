const SIDJP = require('./sidjp')
const Approweb = require('./approweb')
const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')
const expressions = require('angular-expressions')
const fs = require('fs')
const path = require('path')
const akun = require('./config/akun')

const templatePath = path.resolve(__dirname, 'template')
const resultPath = path.resolve(__dirname, 'result')

function replaceErrors(key, value) {
  if (value instanceof Error) {
    return Object.getOwnPropertyNames(value).reduce(function(error, key) {
      error[key] = value[key]
      return error
    }, {})
  }
  return value
}

function errorHandler(error) {
  console.log(JSON.stringify({error: error}, replaceErrors))
  fs.writeFileSync('error.json', JSON.stringify({error: error}, null, 4))

  if (error.properties && error.properties.errors instanceof Array) {
    const errorMessages = error.properties.errors.map(function (error) {
      return error.properties.explanation
    }).join("\n")
    console.log('errorMessages', errorMessages)
  }
  throw error
}

expressions.filters.isEmpty = input => {
  return "- Tidak Ada Data -"
}

function parser(tag) {
  if (tag === '.') {
    return {
      get: function(s){ return s}
    }
  }
  const expr = expressions.compile(
    tag.replace(/(’|‘)/g, "'").replace(/(“|”)/g, '"')
  )
  return {
    get: function(scope, context) {
      const obj = {}
      const scopeList = context.scopeList
      const num = context.num
      for (let i = 0, len = num + 1; i < len; i++) {
        Object.assign(obj, scopeList[i])
      }
      return expr(scope, obj)
    }
  }
}

function getSettingData() {
  const data = require('./config/setting')
  Object.assign(data, { initNpwp: data.npwp, npwp: undefined })
  return data
}

function createProfilFolder(npwp) {
  if (!fs.existsSync(resultPath)) fs.mkdirSync(resultPath)
  
  const wpPath = path.resolve(resultPath, npwp)
  if (!fs.existsSync(wpPath)) fs.mkdirSync(wpPath)
  return wpPath
}

;(async () => {
  const data = getSettingData()
  
  const wpPath = createProfilFolder(data.initNpwp)
  
  try {
    if (fs.existsSync(path.resolve(wpPath, 'data.json'))) {
      Object.assign(data, require(path.resolve(wpPath, 'data.json')))
    }

    const sidjp = await new SIDJP(akun.sidjp.username, akun.sidjp.password, data.initNpwp, data.tahun)
    Object.assign(data, { tanggalAksesSidjp: sidjp.tanggalAkses.toLocaleDateString('en-gb') })

    if (!data.npwp) {
      const profil = await sidjp.getProfil()
      Object.assign(data, profil)
    
      fs.writeFileSync(path.resolve(wpPath, 'data.json'), JSON.stringify(data, null, 4))
    }

    if (!data.spt) {
      const spt = await sidjp.getSpt()
      Object.assign(data, { spt })
    
      fs.writeFileSync(path.resolve(wpPath, 'data.json'), JSON.stringify(data, null, 4))
    }

    if (!data.pemegangSaham || !data.pengurus || !data.sptTahunan) {
      const { listPemegangSaham, listPengurus, listPenghasilan } = await sidjp.getDetailSptTahunan()
      Object.assign(data, { pemegangSaham: listPemegangSaham, pengurus: listPengurus, sptTahunan: listPenghasilan })
    
      fs.writeFileSync(path.resolve(wpPath, 'data.json'), JSON.stringify(data, null, 4))
    }
  
    if (!data.pajakMasukan) {
      const { listPajakMasukan, listPajakMasukanImpor, listPajakKeluaran, listEkspor } = await sidjp.getDetailSptPpn()
      Object.assign(data, { pajakMasukan: listPajakMasukan, pajakMasukanImpor: listPajakMasukanImpor, pajakKeluaran: listPajakKeluaran, ekspor: listEkspor })
    
      fs.writeFileSync(path.resolve(wpPath, 'data.json'), JSON.stringify(data, null, 4))
    }

    if (!data.ikhtisarPembayaran) {
      const ikhtisarPembayaran = await sidjp.getIkhtisarPembayaran()
      Object.assign(data, { ikhtisarPembayaran })

      fs.writeFileSync(path.resolve(wpPath, 'data.json'), JSON.stringify(data, null, 4))
    }

    if (!data.tunggakan) {
      const tunggakan = await sidjp.getTunggakan()
      Object.assign(data, { tunggakan })
      
      fs.writeFileSync(path.resolve(wpPath, 'data.json'), JSON.stringify(data, null, 4))
    }

    await sidjp.logout()

    // const approweb = await new Approweb(akun.approweb.username, akun.approweb.password, data.initNpwp)
    // Object.assign(data, { tanggalAksesApproweb: approweb.tanggalAkses.toLocaleDateString('en-gb') })
    
    // if (!data.sp2dk) {
    //   const sp2dk = await approweb.getSp2dk()
    //   Object.assign(data, { sp2dk })
    
    //   fs.writeFileSync(path.resolve(wpPath, 'data.json'), JSON.stringify(data, null, 4))
    // }
    
    // await approweb.logout()
  } catch (err) {
    console.log(err)
    return false
  }

  fs.readdirSync(path.resolve(templatePath))
    .filter(file => !file.startsWith('~$'))
    .forEach(template => {
      const content = fs.readFileSync(path.resolve(templatePath, template))
      const zip = new PizZip(content)
      let doc
      try {
        doc = new Docxtemplater(zip, { parser, nullGetter: () => '' })
      } catch (err) {
        errorHandler(err)
      }
      doc.setData(data)
  
      try {
        doc.render()
      } catch (err) {
        errorHandler(err)
      }
  
      const buf = doc.getZip().generate({ type: 'nodebuffer' })
      fs.writeFileSync(path.resolve(wpPath, template), buf)
    })
})()