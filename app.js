const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')
const expressions = require('angular-expressions')
const fs = require('fs')
const path = require('path')
const { createLogger, createError } = require('./logger')
const makeData = require('./makeData')
const SIDJP = require('./sidjp')
const Approweb = require('./approweb')
const ALPP = require('./alpp')
const Appportal = require('./appportal')
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

function initData(wpPath) {
  const data = { sidjp: {}, approweb: {}, alpp: {}, appportal: {} }
  
  const sidjpPath = path.resolve(wpPath, 'sidjp.json')
  const approwebPath = path.resolve(wpPath, 'approweb.json')
  const alppPath = path.resolve(wpPath, 'alpp.json')
  const appportalPath = path.resolve(wpPath, 'appportal.json')

  if (fs.existsSync(sidjpPath)) data.sidjp = require(sidjpPath)
  if (fs.existsSync(approwebPath)) data.approweb = require(approwebPath)
  if (fs.existsSync(alppPath)) data.alpp = require(alppPath)
  if (fs.existsSync(appportalPath)) data.appportal = require(appportalPath)

  return data
}

function createProfilFolder(npwp) {
  if (!fs.existsSync(resultPath)) fs.mkdirSync(resultPath)
  
  const wpPath = path.resolve(resultPath, npwp)
  if (!fs.existsSync(wpPath)) fs.mkdirSync(wpPath)
  return wpPath
}

;(async () => {
  const setting = require('./config/setting')

  const wpPath = createProfilFolder(setting.npwp)
  const logger = createLogger(wpPath)

  let data = initData(wpPath)

  const sidjp = new SIDJP(data.sidjp)
  const approweb = new Approweb(data.approweb, { executablePath: setting.chromePath })
  const alpp = new ALPP(data.alpp)
  const appportal = new Appportal(data.appportal)

  try {
    if (!sidjp.isCompleted()) {
      logger.info('sidjp.login ...')
      await sidjp.login(akun.sidjp)
      logger.info('sidjp.login - OK')
    }
  } catch (err) {
    logger.error(createError('sidjp.login - FAIL'))
    logger.error(createError(err))
  }

  if (sidjp.isLoggedIn) {
    try {
      if (!sidjp.profil.npwp) {
        logger.info('sidjp.profil ...')
        await sidjp.getProfil(setting.npwp)
        logger.info('sidjp.profil - OK')
      }
    } catch (err) {
      logger.error(createError('sidjp.profil - FAIL'))
      logger.error(createError(err))
    }
  
    try {
      if (!sidjp.profil.npwp) {
        logger.info('sidjp.spt ...')
        await sidjp.getSpt(setting.tahun)
        logger.info('sidjp.spt - OK')
      }
    } catch (err) {
      logger.error(createError('sidjp.spt - FAIL'))
      logger.error(createError(err))
    }
  
    try {
      if (!sidjp.listPemegangSaham.length || !sidjp.listPengurus.length || !sidjp.listPenghasilan.length) {
        logger.info('sidjp.detailSptTahunan ...')
        await sidjp.getDetailSptTahunan(setting.tahun)
        logger.info('sidjp.detailSptTahunan - OK')
      }
    } catch (err) {
      logger.error(createError('sidjp.detailSptTahunan - FAIL'))
      logger.error(createError(err))
    }
  
    try {
      if (!sidjp.listPajakMasukan.length || !sidjp.listPajakMasukanImpor.length || !sidjp.listPajakKeluaran.length || !sidjp.listEkspor.length || !sidjp.listPajakMasukanTdd.length) {
        logger.info('sidjp.detailSptPpn ...')
        await sidjp.getDetailSptPpn(setting.tahun)
        logger.info('sidjp.detailSptPpn - OK')
      }
    } catch (err) {
      logger.error(createError('sidjp.detailSptPpn - FAIL'))
      logger.error(createError(err))
    }
  
    try {
      if (!sidjp.listIkhtisarPembayaran.length) {
        logger.info('sidjp.ikhtisarPembayaran ...')
        await sidjp.getIkhtisarPembayaran(setting.tahun)
        logger.info('sidjp.ikhtisarPembayaran - OK')
      }
    } catch (err) {
      logger.error(createError('sidjp.ikhtisarPembayaran - FAIL'))
      logger.error(createError(err))
    }
  
    try {
      if (!sidjp.listTunggakan.length) {
        logger.info('sidjp.tunggakan ...')
        await sidjp.getTunggakan(setting.tahun)
        logger.info('sidjp.tunggakan - OK')
      }
    } catch (err) {
      logger.error(createError('sidjp.tunggakan - FAIL'))
      logger.error(createError(err))
    }
  
    try {
      logger.info('sidjp.logout ...')
      await sidjp.logout()
      logger.info('sidjp.logout - OK')
    } catch (err) {
      logger.error(createError('sidjp.logout - FAIL'))
      logger.error(createError(err))
    }
  }

  try {
    if (!approweb.isCompleted()) {
      logger.info('approweb.login ...')
      await approweb.login(akun.approweb)
      logger.info('approweb.login - OK')
    }
  } catch (err) {
    logger.error(createError('approweb.login - FAIL'))
    logger.error(createError(err))
  }

  if (approweb.isLoggedIn) {
    try {
      logger.info('approweb.setWp ...')
      await approweb.setWp(setting.npwp)
      logger.info('approweb.setWp - OK')
    } catch (err) {
      logger.error(createError('approweb.setWp - FAIL'))
      logger.error(createError(err))
    }
    
    try {
      if (!approweb.listSp2dk.length) {
        logger.info('approweb.sp2dk ...')
        await approweb.getSp2dk()
        logger.info('approweb.sp2dk - OK')
      }
    } catch (err) {
      logger.error(createError('approweb.sp2dk - FAIL'))
      logger.error(createError(err))
    }

    try {
      logger.info('approweb.logout ...')
      await approweb.logout()
      logger.info('approweb.logout - OK')
    } catch (err) {
      logger.error(createError('approweb.logout - FAIL'))
      logger.error(createError(err))
    }
  }

  try {
    if (!alpp.isCompleted()) {
      logger.info('alpp.login ...')
      await alpp.login(akun.alpp)
      logger.info('alpp.login - OK')
    }
  } catch (err) {
    logger.error(createError('alpp.login - FAIL'))
    logger.error(createError(err))
  }

  if (alpp.isLoggedIn) {
    try {
      if (!alpp.listRiwayatPemeriksaan.length) {
        logger.info('alpp.riwayatPemeriksaan ...')
        await alpp.getRiwayatPemeriksaan(setting.npwp)
        logger.info('alpp.riwayatPemeriksaan - OK')
      }
    } catch (err) {
      logger.error(createError('alpp.riwayatPemeriksaan - FAIL'))
      logger.error(createError(err))
    }

    try {
      logger.info('alpp.logout ...')
      await alpp.logout()
      logger.info('alpp.logout - OK')
    } catch (err) {
      logger.error(createError('alpp.logout - FAIL'))
      logger.error(createError(err))
    }
  }

  try {
    if (!appportal.isCompleted()) {
      logger.info('appportal.login ...')
      await appportal.login(akun.appportal)
      logger.info('appportal.login - OK')
    }
  } catch (err) {
    logger.error(createError('appportal.login - FAIL'))
    logger.error(createError(err))
  }

  try {
    if (!appportal.isCompleted()) {
      logger.info('appportal.cekAksesPkpm ...')
      await appportal.checkPkpmAccess()
      logger.info('appportal.cekAksesPkpm - OK')
    }
  } catch (err) {
    logger.error(createError('appportal.cekAksesPkpm - FAIL'))
    logger.error(createError(err))
  }

  if (appportal.isLoggedIn && appportal.hasPkpmAccess) {
    try {
      if (!appportal.listPajakMasukan.length || !appportal.listPajakKeluaran.length) {
        logger.info('appportal.pkpm ...')
        await appportal.getPKPM(setting.npwp, setting.tahun)
        logger.info('appportal.pkpm - OK')
      }
    } catch (err) {
      logger.error(createError('appportal.pkpm - FAIL'))
      logger.error(createError(err))
    }

    try {
      logger.info('appportal.logout ...')
      await appportal.logout()
      logger.info('appportal.logout - OK')
    } catch (err) {
      logger.error(createError('appportal.logout - FAIL'))
      logger.error(createError(err))
    }
  }

  data = makeData({ setting, sidjp, approweb, alpp, appportal })
  
  logger.info('data.save ...')
  fs.writeFileSync(path.resolve(wpPath, 'data.json'), JSON.stringify(data, null, 4))
  fs.writeFileSync(path.resolve(wpPath, 'sidjp.json'), JSON.stringify(sidjp, null, 4))
  fs.writeFileSync(path.resolve(wpPath, 'approweb.json'), JSON.stringify(approweb, null, 4))
  fs.writeFileSync(path.resolve(wpPath, 'alpp.json'), JSON.stringify(alpp, null, 4))
  fs.writeFileSync(path.resolve(wpPath, 'appportal.json'), JSON.stringify(appportal, null, 4))
  logger.info('data.save - OK')

  fs.readdirSync(path.resolve(templatePath))
    .filter(file => !file.startsWith('~$'))
    .forEach(template => {
      logger.info(`laporan.create - ${template} ...`)
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
      logger.info(`laporan.create - ${template} - OK`)
    })
})()