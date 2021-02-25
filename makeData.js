function makeData({ setting, sidjp, approweb, alpp, appportal }) {
  return {
    ...setting,
    tanggalAksesSidjp: sidjp.tanggalAkses,
    tanggalFakturApproweb: approweb.tanggalAkses,
    tanggalFakturAlpp: alpp.tanggalAkses,
    tanggalFakturAppportal: appportal.tanggalAkses,
    ...sidjp.profil,
    spt: sidjp.listSpt.map(spt => ({
      tahun: spt.tahun,
      empty: {
        isSptTahunan: !spt.data.find(datum => datum.masa === 'Tahunan'),
        isSpt25: !spt.data.find(datum => /PPH25/.test(datum.bps)),
        isSpt21: !spt.data.find(datum => /PPH21/.test(datum.bps)),
        isSpt22: !spt.data.find(datum => /PPH22/.test(datum.bps)),
        isSpt23: !spt.data.find(datum => /PPH23/.test(datum.bps)),
        isSpt42: !spt.data.find(datum => /PPH42/.test(datum.bps)),
        isSpt15: !spt.data.find(datum => datum.jenisSpt === 'SPT Masa PPh Pasal 15'),
        isSptPpn: !spt.data.find(datum => /PPN1111/.test(datum.bps)),
        isSptPpnPut: !spt.data.find(datum => datum.jenisSpt === 'SPT Masa PPN Pemungut'),
        isSptPpnDm: !spt.data.find(datum => datum.jenisSpt === 'SPT Masa PPN Pedagang Eceran'),
      },
      data: spt.data.map(datum => ({
        ...datum,
        isSptTahunan: datum.masa === 'Tahunan',
        isSpt25: /PPH25/.test(datum.bps),
        isSpt21: /PPH25/.test(datum.bps),
        isSpt22: /PPH25/.test(datum.bps),
        isSpt23: /PPH25/.test(datum.bps),
        isSpt42: /PPH25/.test(datum.bps),
        isSpt15: datum.jenisSpt === 'SPT Masa PPh Pasal 15',
        isSptPpn: /PPN1111/.test(datum.bps),
        isSptPpnPut: datum.jenisSpt === 'SPT Masa PPN Pemungut',
        isSptPpnDm: datum.jenisSpt === 'SPT Masa PPN Pedagang Eceran',
      }))
    })),
    pemegangSaham: sidjp.listPemegangSaham,
    pengurus: sidjp.listPengurus,
    sptTahunan: {
      tahun: ['No.', 'Uraian', ...sidjp.listPenghasilan.map(e => e.tahun)],
      data: [
        [
          '1.',
          "PENGHASILAN NETO KOMERSIAL DALAM NEGERI",
          "",
          "",
        ],
        ...sidjp.listPenghasilan
          .map(x => x.data)[0]
          .map((x, i) => [
            ['','','','','','','','','2.','3.'].find((x, j) => i === j),
            [
              'a. PEREDARAN USAHA',
              'b. HARGA POKOK PENJUALAN',
              'c. BIAYA USAHA LAINNYA',
              'd. PENGHASILAN NETO DARI USAHA ( 1a - 1b - 1c )',
              'e. PENGHASILAN DARI LUAR USAHA',
              'f. BIAYA DARI LUAR USAHA',
              'g. PENGHASILAN NETO DARI LUAR USAHA',
              'h. JUMLAH',
              'PENGHASILAN NETO KOMERSIAL LUAR NEGERI',
              'JUMLAH PENGHASILAN NETO KOMERSIAL ( 1h + 2 )',
            ].find((x, j) => i === j),
            ...sidjp.listPenghasilan
              .map(x => x.data)
              .map(x => x[i])
          ])
      ]
    },
    pajakMasukan: sidjp.listPajakMasukan.map(pm => ({
      tahun: pm.tahun,
      data: [].concat(...Object.values(pm.data.reduce((prev, cur) => ({
        ...prev,
        [cur['masa']]: [
          ...(prev[cur['masa']] || []),
          cur,
        ],
      }), {})).map(x => [{
        nomor: '',
        nama: 'MASA ' + x[0].masa,
        npwp: '',
        kodeFaktur: '',
        tanggalFaktur: '',
        ...x.reduce((prev, cur) => ({
          dpp: (+prev.dpp.replace(/\D/g, '') + +cur.dpp.replace(/\D/g, '')).toLocaleString('id'),
          ppn: (+prev.ppn.replace(/\D/g, '') + +cur.ppn.replace(/\D/g, '')).toLocaleString('id'),
          ppnbm: (+prev.ppnbm.replace(/\D/g, '') + +cur.ppnbm.replace(/\D/g, '')).toLocaleString('id'),
        }), { dpp: '0', ppn: '0', ppnbm: '0' })
      }, ...x, {
        nomor: '',
        nama: '',
        npwp: '',
        kodeFaktur: '',
        tanggalFaktur: '',
        dpp: '',
        ppm: '',
        ppnbm: ''
      }]))
    })),
    pajakMasukanImpor: sidjp.listPajakMasukanImpor.map(pm => ({
      tahun: pm.tahun,
      data: [].concat(...Object.values(pm.data.reduce((prev, cur) => ({
        ...prev,
        [cur['masa']]: [
          ...(prev[cur['masa']] || []),
          cur,
        ],
      }), {})).map(x => [{
        nomor: '',
        nama: 'MASA ' + x[0].masa,
        npwp: '',
        nomorDokumen: '',
        tanggalDokumen: '',
        ...x.reduce((prev, cur) => ({
          dpp: (+prev.dpp.replace(/\D/g, '') + +cur.dpp.replace(/\D/g, '')).toLocaleString('id'),
        }), { dpp: '0' })
      }, ...x, {
        nomor: '',
        nama: '',
        npwp: '',
        nomorDokumen: '',
        tanggalDokumen: '',
        dpp: '',
      }]))
    })),
    pajakKeluaran: sidjp.listPajakKeluaran.map(pm => ({
      tahun: pm.tahun,
      data: [].concat(...Object.values(pm.data.reduce((prev, cur) => ({
        ...prev,
        [cur['masa']]: [
          ...(prev[cur['masa']] || []),
          cur,
        ],
      }), {})).map(x => [{
        nomor: '',
        nama: 'MASA ' + x[0].masa,
        npwp: '',
        kodeFaktur: '',
        tanggalFaktur: '',
        ...x.reduce((prev, cur) => ({
          dpp: (+prev.dpp.replace(/\D/g, '') + +cur.dpp.replace(/\D/g, '')).toLocaleString('id'),
          ppn: (+prev.ppn.replace(/\D/g, '') + +cur.ppn.replace(/\D/g, '')).toLocaleString('id'),
          ppnbm: (+prev.ppnbm.replace(/\D/g, '') + +cur.ppnbm.replace(/\D/g, '')).toLocaleString('id'),
        }), { dpp: '0', ppn: '0', ppnbm: '0' })
      }, ...x, {
        nomor: '',
        nama: '',
        npwp: '',
        kodeFaktur: '',
        tanggalFaktur: '',
        dpp: '',
        ppm: '',
        ppnbm: ''
      }]))
    })),
    ekspor: sidjp.listEkspor.map(pm => ({
      tahun: pm.tahun,
      data: [].concat(...Object.values(pm.data.reduce((prev, cur) => ({
        ...prev,
        [cur['masa']]: [
          ...(prev[cur['masa']] || []),
          cur,
        ],
      }), {})).map(x => [{
        nomor: '',
        nama: 'MASA ' + x[0].masa,
        nomorDokumen: '',
        tanggalDokumen: '',
        ...x.reduce((prev, cur) => ({
          dpp: (+prev.dpp.replace(/\D/g, '') + +cur.dpp.replace(/\D/g, '')).toLocaleString('id'),
        }), { dpp: '0' })
      }, ...x, {
        nomor: '',
        nama: '',
        nomorDokumen: '',
        tanggalDokumen: '',
        dpp: '',
      }]))
    })),
    pajakMasukanTdd: sidjp.listPajakMasukanTdd.map(pm => ({
      tahun: pm.tahun,
      data: [].concat(...Object.values(pm.data.reduce((prev, cur) => ({
        ...prev,
        [cur['masa']]: [
          ...(prev[cur['masa']] || []),
          cur,
        ],
      }), {})).map(x => [{
        nomor: '',
        nama: 'MASA ' + x[0].masa,
        npwp: '',
        kodeFaktur: '',
        tanggalFaktur: '',
        ...x.reduce((prev, cur) => ({
          dpp: (+prev.dpp.replace(/\D/g, '') + +cur.dpp.replace(/\D/g, '')).toLocaleString('id'),
          ppn: (+prev.ppn.replace(/\D/g, '') + +cur.ppn.replace(/\D/g, '')).toLocaleString('id'),
          ppnbm: (+prev.ppnbm.replace(/\D/g, '') + +cur.ppnbm.replace(/\D/g, '')).toLocaleString('id'),
        }), { dpp: '0', ppn: '0', ppnbm: '0' })
      }, ...x, {
        nomor: '',
        nama: '',
        npwp: '',
        kodeFaktur: '',
        tanggalFaktur: '',
        dpp: '',
        ppm: '',
        ppnbm: ''
      }]))
    })),
    ikhtisarPembayaran: sidjp.listIkhtisarPembayaran.map(ikhtisarPembayaran => ({
      tahun: ikhtisarPembayaran.tahun,
      keys: ['Masa', ...ikhtisarPembayaran.data.map(datum => datum.jenisPajak)],
      data: [
        'jumlah', 'januari', 'februari', 'maret', 'april', 'mei', 'juni',
        'juli', 'agustus', 'september', 'oktober', 'november', 'desember', 'tahunan',
      ].map((key, i) => ([
        i === 0 ? key : key === 'tahunan' ? 'Tahunan' : i,
        ...ikhtisarPembayaran.data.map(e => e[key])
      ])),
    })),
    tunggakan: sidjp.listTunggakan.map(tunggakan => ({
      ...tunggakan,
      empty: !tunggakan.data.length
    })),
    sp2dk: approweb.listSp2dk,
    sp2dkEmpty: !approweb.listSp2dk.length,
    riwayatPemeriksaan: alpp.listRiwayatPemeriksaan,
    riwayatPemeriksaanEmpty: !alpp.listRiwayatPemeriksaan.length,
    fakturPK: appportal.listPajakKeluaran.map(pm => ({
      tahun: pm.tahun,
      ...pm.data.reduce((prev, cur) => ({
        ppnLaporSendiri: (+prev.ppnLaporSendiri.replace(/\D/g, '') + cur['PPN DILAPORKAN WP SENDIRI']).toLocaleString('id'),
        ppnLaporLawan: (+prev.ppnLaporLawan.replace(/\D/g, '') + cur['PPN DILAPORKAN LAWAN']).toLocaleString('id'),
      }), { ppnLaporSendiri: '0', ppnLaporLawan: '0' })
    })),
    fakturPM: appportal.listPajakMasukan.map(pm => ({
      tahun: pm.tahun,
      ...pm.data.reduce((prev, cur) => ({
        ppnLaporSendiri: (+prev.ppnLaporSendiri.replace(/\D/g, '') + cur['PPN DILAPORKAN WP SENDIRI']).toLocaleString('id'),
        ppnLaporLawan: (+prev.ppnLaporLawan.replace(/\D/g, '') + cur['PPN DILAPORKAN LAWAN']).toLocaleString('id'),
      }), { ppnLaporSendiri: '0', ppnLaporLawan: '0' })
    })),
  }
}

module.exports = makeData