import { Injectable } from '@angular/core';

import * as xlsx from 'xlsx';
import * as ADODB from 'node-adodb';

import Models from '../schemas/siskeudesModel';
import settings from '../stores/settings';

const queryVisiRPJM = `SELECT   Ta_RPJM_Visi.*
                        FROM    (Ta_Desa INNER JOIN Ta_RPJM_Visi ON Ta_Desa.Kd_Desa = Ta_RPJM_Visi.Kd_Desa)`;

const queryRenstraRPJM = `SELECT    Ta_RPJM_Visi.ID_Visi, Ta_RPJM_Misi.ID_Misi, Ta_RPJM_Tujuan.ID_Tujuan, Ta_RPJM_Sasaran.ID_Sasaran, Ta_RPJM_Visi.Uraian_Visi, Ta_RPJM_Misi.Uraian_Misi, Ta_RPJM_Tujuan.Uraian_Tujuan, 
                                    Ta_RPJM_Sasaran.Uraian_Sasaran
                            FROM    ((((Ta_Desa INNER JOIN
                                    Ta_RPJM_Visi ON Ta_Desa.Kd_Desa = Ta_RPJM_Visi.Kd_Desa) LEFT OUTER JOIN
                                    Ta_RPJM_Misi ON Ta_RPJM_Visi.ID_Visi = Ta_RPJM_Misi.ID_Visi) LEFT OUTER JOIN
                                    Ta_RPJM_Tujuan ON Ta_RPJM_Misi.ID_Misi = Ta_RPJM_Tujuan.ID_Misi) LEFT OUTER JOIN
                                    Ta_RPJM_Sasaran ON Ta_RPJM_Tujuan.ID_Tujuan = Ta_RPJM_Sasaran.ID_Tujuan)`;

const queryRPJM = `SELECT       Ta_RPJM_Bidang.Nama_Bidang, Ta_RPJM_Kegiatan.Kd_Desa, Ta_RPJM_Kegiatan.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.ID_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan, Ta_RPJM_Kegiatan.Lokasi, 
                                Ta_RPJM_Kegiatan.Keluaran, Ta_RPJM_Kegiatan.Kd_Sas, Ta_RPJM_Kegiatan.Sasaran, Ta_RPJM_Kegiatan.Tahun1, Ta_RPJM_Kegiatan.Tahun2, Ta_RPJM_Kegiatan.Tahun3, Ta_RPJM_Kegiatan.Tahun4, 
                                Ta_RPJM_Kegiatan.Tahun5, Ta_RPJM_Kegiatan.Swakelola, Ta_RPJM_Kegiatan.Kerjasama, Ta_RPJM_Kegiatan.Pihak_Ketiga, Ta_RPJM_Kegiatan.Sumberdana, Ta_RPJM_Kegiatan.Tahun6, 
                                Ta_RPJM_Sasaran.Uraian_Sasaran
                    FROM        ((Ta_RPJM_Bidang INNER JOIN
                                Ta_RPJM_Kegiatan ON Ta_RPJM_Bidang.Kd_Bid = Ta_RPJM_Kegiatan.Kd_Bid) LEFT OUTER JOIN
                                Ta_RPJM_Sasaran ON Ta_RPJM_Kegiatan.Kd_Sas = Ta_RPJM_Sasaran.ID_Sasaran)`;

const queryPaguTahunan = `SELECT    Bid.Kd_Bid, Bid.Nama_Bidang, Keg.Nama_Kegiatan, Pagu.Kd_Desa, Pagu.Kd_Keg, Pagu.Kd_Tahun, Pagu.Kd_Sumber, Pagu.Biaya, Pagu.Volume, Pagu.Satuan, Pagu.Lokasi_Spesifik, Pagu.Jml_Sas_Pria, 
                                    Pagu.Jml_Sas_Wanita, Pagu.Jml_Sas_ARTM, Pagu.Waktu, Format(Pagu.Mulai, 'dd/mm/yyyy') AS Mulai, Format(Pagu.Selesai, 'Short Date') AS Selesai, Pagu.Pola_Kegiatan, Pagu.Pelaksana
                            FROM    ((Ta_RPJM_Pagu_Tahunan Pagu INNER JOIN
                                    Ta_RPJM_Kegiatan Keg ON Pagu.Kd_Keg = Keg.Kd_Keg) INNER JOIN
                                    Ta_RPJM_Bidang Bid ON Keg.Kd_Bid = Bid.Kd_Bid)`;

const queryRPJMBidAndKeg = `SELECT  Ta_RPJM_Bidang.Kd_Bid, Ta_RPJM_Bidang.Nama_Bidang, Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan
                            FROM    (Ta_RPJM_Bidang INNER JOIN Ta_RPJM_Kegiatan ON Ta_RPJM_Bidang.Kd_Bid = Ta_RPJM_Kegiatan.Kd_Bid)`

const queryPendAndPemb = `SELECT    Rek1.Akun, Rek1.Nama_Akun, Rek2.Kelompok, Rek2.Nama_Kelompok, Rek3.Jenis, Rek3.Nama_Jenis, Rek4.Obyek, Rek4.Nama_Obyek, Bdg.Kd_Bid, Bdg.Nama_Bidang, Keg.Kd_Keg, Keg.Nama_Kegiatan, 
                                    RABSub.Kd_SubRinci, RABSub.Nama_SubRinci, RAB.Kd_Rincian, RABRi.Uraian, RABRi.SumberDana, RABRi.Satuan, RABRi.JmlSatuan, RAB.Kd_Desa, RABRi.HrgSatuan, RABRi.Anggaran, RABRi.JmlSatuanPAK, 
                                    RABRi.HrgSatuanPAK, RABRi.AnggaranStlhPAK, RABRi.AnggaranPAK, RABRi.Kode_SBU, [Rek4.Obyek] & [RABSub.Kd_SubRinci] AS Kode_SubRinci, IIF(Rek3.Jenis = '5.1.3.', [Kode_SubRinci] &  '.', Rek4.Obyek) & [RABRi.No_Urut] AS Kode_Rincian, Rek4.Obyek & [RABRi.No_Urut] AS Obyek_Rincian, RABRi.No_Urut
                            FROM    ((((((Ref_Desa RefDs INNER JOIN
                                    (Ta_RAB RAB INNER JOIN
                                    Ta_Desa Ds ON RAB.Kd_Desa = Ds.Kd_Desa AND RAB.Tahun = Ds.Tahun) ON RefDs.Kd_Desa = Ds.Kd_Desa) LEFT OUTER JOIN
                                    Ta_RABRinci RABRi ON RAB.Tahun = RABRi.Tahun AND RAB.Kd_Desa = RABRi.Kd_Desa AND RAB.Kd_Keg = RABRi.Kd_Keg AND RAB.Kd_Rincian = RABRi.Kd_Rincian) LEFT OUTER JOIN
                                    (Ref_Rek1 Rek1 RIGHT OUTER JOIN
                                    (Ref_Rek2 Rek2 RIGHT OUTER JOIN
                                    (Ref_Rek4 Rek4 LEFT OUTER JOIN
                                    Ref_Rek3 Rek3 ON Rek4.Jenis = Rek3.Jenis) ON Rek2.Kelompok = Rek3.Kelompok) ON Rek1.Akun = Rek2.Akun) ON RAB.Kd_Rincian = Rek4.Obyek) LEFT OUTER JOIN
                                    Ta_Kegiatan Keg ON RAB.Kd_Keg = Keg.Kd_Keg AND RAB.Kd_Desa = Keg.Kd_Desa AND RAB.Tahun = Keg.Tahun) LEFT OUTER JOIN
                                    Ta_Bidang Bdg ON Keg.Kd_Bid = Bdg.Kd_Bid AND Keg.Kd_Desa = Bdg.Kd_Desa) LEFT OUTER JOIN
                                    Ta_RABSub RABSub ON RAB.Tahun = RABSub.Tahun AND RAB.Kd_Desa = RABSub.Kd_Desa AND RAB.Kd_Keg = RABSub.Kd_Keg AND RAB.Kd_Rincian = RABSub.Kd_Rincian) `

const queryBelanja = `  SELECT  Rek1.Akun, Rek1.Nama_Akun, Rek2.Kelompok, Rek2.Nama_Kelompok, Rek3.Jenis, Rek3.Nama_Jenis, Rek4.Obyek, Rek4.Nama_Obyek, Bdg.Kd_Bid, Bdg.Nama_Bidang, Keg.Kd_Keg, Keg.Nama_Kegiatan, 
                                RABSub.Kd_SubRinci, RABSub.Nama_SubRinci, RAB.Kd_Rincian, RABRi.Uraian, RABRi.SumberDana, RABRi.Satuan, RABRi.JmlSatuan, RAB.Kd_Desa, RABRi.HrgSatuan, RABRi.Anggaran, RABRi.JmlSatuanPAK, 
                                RABRi.HrgSatuanPAK, RABRi.AnggaranStlhPAK, RABRi.AnggaranPAK, RABRi.Kode_SBU, [Rek4.Obyek] & [RABSub.Kd_SubRinci] AS Kode_SubRinci, IIF(Rek3.Jenis = '5.1.3.', [Kode_SubRinci] &  '.', Rek4.Obyek) & [RABRi.No_Urut] AS Kode_Rincian, Rek4.Obyek & [RABRi.No_Urut] AS Obyek_Rincian, RABRi.No_Urut
                        FROM    (Ta_Bidang Bdg RIGHT OUTER JOIN
                                ((((Ref_Desa RefDs INNER JOIN
                                (Ta_RAB RAB INNER JOIN
                                Ta_Desa Ds ON RAB.Kd_Desa = Ds.Kd_Desa AND RAB.Tahun = Ds.Tahun) ON RefDs.Kd_Desa = Ds.Kd_Desa) INNER JOIN
                                (Ta_RABRinci RABRi INNER JOIN
                                Ta_RABSub RABSub ON RABRi.Tahun = RABSub.Tahun AND RABRi.Kd_Desa = RABSub.Kd_Desa AND RABRi.Kd_Keg = RABSub.Kd_Keg AND RABRi.Kd_Rincian = RABSub.Kd_Rincian AND 
                                RABRi.Kd_SubRinci = RABSub.Kd_SubRinci) ON RAB.Tahun = RABSub.Tahun AND RAB.Kd_Desa = RABSub.Kd_Desa AND RAB.Kd_Keg = RABSub.Kd_Keg AND RAB.Kd_Rincian = RABSub.Kd_Rincian) LEFT OUTER JOIN
                                (Ref_Rek1 Rek1 RIGHT OUTER JOIN
                                (Ref_Rek2 Rek2 RIGHT OUTER JOIN
                                (Ref_Rek4 Rek4 LEFT OUTER JOIN
                                Ref_Rek3 Rek3 ON Rek4.Jenis = Rek3.Jenis) ON Rek2.Kelompok = Rek3.Kelompok) ON Rek1.Akun = Rek2.Akun) ON RAB.Kd_Rincian = Rek4.Obyek) LEFT OUTER JOIN
                                Ta_Kegiatan Keg ON RAB.Kd_Keg = Keg.Kd_Keg AND RAB.Kd_Desa = Keg.Kd_Desa AND RAB.Tahun = Keg.Tahun) ON Bdg.Kd_Bid = Keg.Kd_Bid AND Bdg.Kd_Desa = Keg.Kd_Desa)`

const querySumRAB = `SELECT  RAB.Tahun, Rek1.Nama_Akun, SUM(RABRi.Anggaran) AS Anggaran, Rek2.Akun, Ds.Kd_Desa
                    FROM    ((((Ref_Rek2 Rek2 INNER JOIN
                            Ref_Rek1 Rek1 ON Rek2.Akun = Rek1.Akun) INNER JOIN
                            Ref_Rek3 Rek3 ON Rek2.Kelompok = Rek3.Kelompok) INNER JOIN
                            Ref_Rek4 Rek4 ON Rek3.Jenis = Rek4.Jenis) INNER JOIN
                            (Ta_Desa Ds INNER JOIN
                            (Ta_RAB RAB INNER JOIN
                            Ta_RABRinci RABRi ON RAB.Kd_Rincian = RABRi.Kd_Rincian AND RAB.Kd_Keg = RABRi.Kd_Keg AND RAB.Kd_Desa = RABRi.Kd_Desa AND RAB.Tahun = RABRi.Tahun) ON Ds.Tahun = RAB.Tahun AND 
                            Ds.Kd_Desa = RAB.Kd_Desa) ON Rek4.Obyek = RAB.Kd_Rincian) `;

const queryGetAllKegiatan = `SELECT     Keg.* 
                             FROM       (Ta_Desa Ds INNER JOIN Ta_Kegiatan Keg ON Ds.Tahun = Keg.Tahun AND Ds.Kd_Desa = Keg.Kd_Desa)`;


const queryGetBidAndKeg = `SELECT   Ta_Bidang.Kd_Bid, Ta_Bidang.Nama_Bidang, Ta_Kegiatan.Kd_Keg, Ta_Kegiatan.Nama_Kegiatan, Ta_Kegiatan.Pagu

                            FROM    ((Ta_Bidang INNER JOIN
                                    Ta_Kegiatan ON Ta_Bidang.Tahun = Ta_Kegiatan.Tahun AND Ta_Bidang.Kd_Bid = Ta_Kegiatan.Kd_Bid) INNER JOIN
                                    Ta_Desa ON Ta_Bidang.Tahun = Ta_Desa.Tahun AND Ta_Bidang.Kd_Desa = Ta_Desa.Kd_Desa)`;

const querySumberdanaPaguTahunan = `SELECT  DISTINCT Ta_RPJM_Kegiatan.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Pagu_Tahunan.Kd_Sumber
                                    FROM    (Ta_RPJM_Kegiatan INNER JOIN
                                            Ta_RPJM_Pagu_Tahunan ON Ta_RPJM_Kegiatan.Kd_Keg = Ta_RPJM_Pagu_Tahunan.Kd_Keg) `;

const querySPP = `SELECT    Ta_SPP.No_SPP, Format(Ta_SPP.Tgl_SPP, 'dd/mm/yyyy') AS Tgl_SPP, Ta_SPP.Jn_SPP, Ta_SPP.Keterangan, Ta_SPP.Jumlah, Ta_SPP.Potongan, Ta_SPP.Tahun, Ds.Kd_Desa
                  FROM      (Ta_Desa Ds INNER JOIN Ta_SPP ON Ds.Kd_Desa = Ta_SPP.Kd_Desa) `;

const queryDetailSPP = `SELECT      S.Keterangan, SB.Keterangan AS Keterangan_Bukti, SR.Sumberdana, SR.Nilai, S.No_SPP, SR.Kd_Rincian, SB.Nm_Penerima, Format(SB.Tgl_Bukti, 'dd/mm/yyyy') AS Tgl_Bukti, SB.Rek_Bank, SB.Nm_Bank, SB.NPWP, 
                                    SB.Nilai AS Nilai_SPP_Bukti, SB.No_Bukti, SB.Alamat, SR.Kd_Keg, SPo.Nilai AS Nilai_SPPPot, Format(S.Tgl_SPP, 'dd/mm/yyyy') AS Tgl_SPP, SPo.Kd_Rincian AS Kd_Potongan, Rek4.Nama_Obyek, SR.Kd_Rincian AS KdRinci, 
                                    SB.No_Bukti AS NoBukti
                        FROM        ((((Ta_SPPRinci SR INNER JOIN  Ta_SPP S ON SR.No_SPP = S.No_SPP) INNER JOIN
                                    Ref_Rek4 Rek4 ON SR.Kd_Rincian = Rek4.Obyek) LEFT OUTER JOIN
                                    Ta_SPPBukti SB ON SR.No_SPP = SB.No_SPP AND SR.Kd_Keg = SB.Kd_Keg AND SR.Kd_Rincian = SB.Kd_Rincian AND SR.Sumberdana = SB.Sumberdana) LEFT OUTER JOIN
                                    Ta_SPPPot SPo ON SB.No_Bukti = SPo.No_Bukti)`;

const queryRABSub = `SELECT     Ta_RAB.Kd_Rincian, Ta_RABSub.Nama_SubRinci, Ta_RAB.Anggaran, Ta_RABRinci.SumberDana AS Sumberdana
                     FROM       ((Ta_RAB INNER JOIN
                                Ta_RABSub ON Ta_RAB.Tahun = Ta_RABSub.Tahun AND Ta_RAB.Kd_Desa = Ta_RABSub.Kd_Desa AND Ta_RAB.Kd_Keg = Ta_RABSub.Kd_Keg AND Ta_RAB.Kd_Rincian = Ta_RABSub.Kd_Rincian) INNER JOIN
                                Ta_RABRinci ON Ta_RABSub.Tahun = Ta_RABRinci.Tahun AND Ta_RABSub.Kd_Desa = Ta_RABRinci.Kd_Desa AND Ta_RABSub.Kd_Keg = Ta_RABRinci.Kd_Keg AND Ta_RABSub.Kd_Rincian = Ta_RABRinci.Kd_Rincian AND 
                                Ta_RABSub.Kd_SubRinci = Ta_RABRinci.Kd_SubRinci)`;

const querySisaAnggaranRAB = `SELECT    Ta_Anggaran.Tahun, Ta_Anggaran.Kd_Keg, Ta_Anggaran.Kd_Rincian, Ref_Rek4.Nama_Obyek, Ta_Anggaran.SumberDana As Sumberdana, Ta_Anggaran.Anggaran, IIF(SUM(Ta_SPPRinci.Nilai) is Null ,0,SUM(Ta_SPPRinci.Nilai)) AS Terpakai, [Ta_Anggaran.Anggaran] - [Terpakai] AS Sisa
                                FROM    (((Ta_Anggaran INNER JOIN
                                        Ta_Kegiatan ON Ta_Anggaran.Tahun = Ta_Kegiatan.Tahun AND Ta_Anggaran.Kd_Keg = Ta_Kegiatan.Kd_Keg) INNER JOIN
                                        Ref_Rek4 ON Ta_Anggaran.Kd_Rincian = Ref_Rek4.Obyek) LEFT OUTER JOIN
                                        Ta_SPPRinci ON Ta_Anggaran.Kd_Rincian = Ta_SPPRinci.Kd_Rincian AND Ta_Anggaran.Kd_Keg = Ta_SPPRinci.Kd_Keg)`;

const queryGetKodeKegiatan = `SELECT    Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan, Ta_RPJM_Kegiatan.Sumberdana
                              FROM      ((Ta_Desa INNER JOIN
                                        Ta_RABSub ON Ta_Desa.Kd_Desa = Ta_RABSub.Kd_Desa) LEFT OUTER JOIN
                                        Ta_RPJM_Kegiatan ON Ta_RABSub.Kd_Keg = Ta_RPJM_Kegiatan.Kd_Keg) `;

const queryRefPotongan = `SELECT    Ref_Potongan.*, Ref_Rek4.*
                          FROM      (Ref_Potongan INNER JOIN Ref_Rek4 ON Ref_Potongan.Kd_Rincian = Ref_Rek4.Obyek)`;

const queryGetRefRek = `SELECT      Rek1.Akun, Rek1.Nama_Akun, Rek2.Kelompok, Rek2.Nama_Kelompok, Rek3.Jenis, Rek3.Nama_Jenis, Rek4.Obyek, Rek4.Nama_Obyek
                        FROM        (((Ref_Rek1 Rek1 INNER JOIN
                                    Ref_Rek2 Rek2 ON Rek1.Akun = Rek2.Akun) INNER JOIN
                                    Ref_Rek3 Rek3 ON Rek2.Kelompok = Rek3.Kelompok) INNER JOIN
                                    Ref_Rek4 Rek4 ON Rek3.Jenis = Rek4.Jenis) `;

const queryRefSumberdana = `SELECT  Kode, Nama_Sumber, Urut
                            FROM    Ref_Sumber
                            ORDER BY Urut`;

const queryGetMaxNoSPP =  `SELECT MAX(No_SPP) AS No_SPP FROM  Ta_SPP`;

const queryGetMaxNoBukti = `SELECT MAX(No_Bukti) AS No_Bukti FROM  Ta_SPPBukti`;

const queryGetMaxNoTBP =  `SELECT MAX(No_Bukti) AS No_Bukti   FROM Ta_TBP`;

const queryGetMaxSTS = 'SELECT  MAX(No_Bukti) AS No_Bukti FROM  Ta_STS';

const queryRefBidang = `SELECT Ref_Bidang.* FROM Ref_Bidang`;

const queryRefKegiatan = `SELECT Ref_Kegiatan.* FROM Ref_Kegiatan`;

const queryTaDesa = `SELECT Ref_Kecamatan.Kd_Kec, Ref_Kecamatan.Nama_Kecamatan, Ref_Desa.Nama_Desa, Ta_Desa.*
                        FROM    ((Ta_Desa INNER JOIN
                                    Ref_Desa ON Ta_Desa.Kd_Desa = Ref_Desa.Kd_Desa) INNER JOIN
                                    Ref_Kecamatan ON Ref_Desa.Kd_Kec = Ref_Kecamatan.Kd_Kec)`;
const querySasaran = `SELECT ID_Sasaran, Kd_Desa, ID_Tujuan, No_Sasaran, Uraian_Sasaran FROM Ta_RPJM_Sasaran `;

const queryAnggaranLog = `SELECT    Ta_AnggaranLog.KdPosting, Ta_AnggaranLog.Tahun, Ta_AnggaranLog.Kd_Desa, Ta_AnggaranLog.No_Perdes, Format(Ta_AnggaranLog.TglPosting, 'dd/mm/yyyy') AS TglPosting , Ta_AnggaranLog.UserID, Ta_AnggaranLog.Kunci, Ref_Desa.Nama_Desa
                            FROM    (Ta_AnggaranLog INNER JOIN  Ref_Desa ON Ta_AnggaranLog.Kd_Desa = Ref_Desa.Kd_Desa) `;

const queryPencairanSPP =  `SELECT  Tahun, No_Cek, No_SPP, Tgl_Cek, Kd_Desa, Keterangan, Jumlah, Potongan, KdBayar FROM Ta_Pencairan`;

const queryPenerimaan =   `SELECT       Ta_TBP.Tahun, Ta_TBP.No_Bukti, Format(Ta_TBP.Tgl_Bukti, 'dd/mm/yyyy') AS Tgl_Bukti, Ta_TBP.Kd_Desa, Ta_TBP.Uraian, Ta_TBP.Nm_Penyetor, Ta_TBP.Alamat_Penyetor, Ta_TBP.TTD_Penyetor, Ta_TBP.NoRek_Bank, 
                                        Ta_TBP.Nama_Bank, Ta_TBP.Jumlah, Ta_TBP.Nm_Bendahara, Ta_TBP.Jbt_Bendahara, Ta_TBP.Status, Ta_TBP.KdBayar, Ta_TBP.Ref_Bayar, Ta_TBPRinci.Kd_Keg, Ta_TBPRinci.Kd_Rincian, Ta_TBPRinci.RincianSD, 
                                        Ta_TBPRinci.SumberDana, Ta_TBPRinci.Nilai, Ref_Rek4.Nama_Obyek, Ta_Kegiatan.Nama_Kegiatan
                            FROM        (((Ta_Kegiatan RIGHT OUTER JOIN
                                        Ta_TBPRinci ON Ta_Kegiatan.Kd_Keg = Ta_TBPRinci.Kd_Keg) LEFT OUTER JOIN
                                        Ref_Rek4 ON Ta_TBPRinci.Kd_Rincian = Ref_Rek4.Obyek) RIGHT OUTER JOIN
                                        Ta_TBP ON Ta_TBPRinci.No_Bukti = Ta_TBP.No_Bukti)`;

const queryPenyetoran = `SELECT     Ta_STS.Tahun, Ta_STS.No_Bukti, Format(Ta_STS.Tgl_Bukti, 'dd/mm/yyyy') AS Tgl_Bukti, Ta_STS.Kd_Desa, Ta_STS.Uraian, Ta_STS.NoRek_Bank, Ta_STS.Nama_Bank, Ta_STS.Jumlah, Ta_STS.Nm_Bendahara, Ta_STS.Jbt_Bendahara, 
                                    Ta_STSRinci.Uraian AS Uraian_Rinci, Ta_STSRinci.Nilai, Ta_STSRinci.No_TBP
                        FROM        (Ta_STS LEFT OUTER JOIN  Ta_STSRinci ON Ta_STS.No_Bukti = Ta_STSRinci.No_Bukti)`;

const queryRincianTBP = `SELECT     A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, A.SumberDana, SUM(A.Anggaran) + SUM(A.AnggaranPAK) AS Nilai, B.Nama_Obyek
                        FROM        (Ta_RABRinci A INNER JOIN  Ref_Rek4 B ON A.Kd_Rincian = B.Obyek)
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, A.SumberDana, B.Nama_Obyek`;
                        
const queryFixMultipleMisi = `  ALTER TABLE Ta_RPJM_Tujuan DROP CONSTRAINT Kd_Visi;
                                ALTER TABLE Ta_RPJM_Sasaran DROP CONSTRAINT Kd_Visi;
                                ALTER TABLE Ta_RPJM_Tujuan DROP CONSTRAINT Ta_RPJM_MisiTa_RPJM_Tujuan;
                                ALTER TABLE Ta_RPJM_Tujuan ADD CONSTRAINT Ta_RPJM_MisiTa_RPJM_Tujuan FOREIGN KEY (ID_Misi) REFERENCES Ta_RPJM_Misi(ID_Misi) ON UPDATE CASCADE;
                                ALTER TABLE Ta_RPJM_Sasaran DROP CONSTRAINT Ta_RPJM_TujuanTa_RPJM_Sasaran;
                                ALTER TABLE Ta_RPJM_Sasaran ADD CONSTRAINT Ta_RPJM_TujuanTa_RPJM_Sasaran FOREIGN KEY (ID_Tujuan) REFERENCES Ta_RPJM_Tujuan(ID_Tujuan) ON UPDATE CASCADE;`

@Injectable()
export default class SiskeudesService {
    connection: ADODB.ADODB.ADODB;
    kodeDesa: string;
    constructor() {
        let fileName = settings.data["siskeudes.path"];
        let config = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + fileName;
        this.connection = ADODB.open(config);
        this.kodeDesa = settings.data['kodeDesa'];;
    }

    get(query, callback) {
        this.connection
            .query(query)
            .on('done', function (data) {
                callback(data);
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    execute(query, callback) {
        this.connection
            .execute(query)
            .on('done', function (data) {
                callback(data)
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    getWithTransaction(query, callback) {
        this.connection
            .queryWithTransaction(query)
            .on('done', function (data) {
                callback(data);
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    executeWithTransaction(query, callback) {
        this.connection
            .executeWithTransaction(query)
            .on('done', function (data) {
                callback(data)
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    bulkExecuteWithTransaction(query, callback) {
        this.connection
            .bulkExecuteWithTransaction(query)
            .on('done', function (data) {
                callback(data)
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    saveToSiskeudesDB(bundleData, type, callback: any): void {
        let me = this;
        let queries = [];

        bundleData.insert.forEach(c => {
            let table = Object.keys(c)[0];
            let query = me.createQueryInsert(table, c[table]);
            queries.push(query);
        });

        bundleData.update.forEach(c => {
            let table = Object.keys(c)[0];
            let query = me.createQueryUpdate(table, c[table]);
            queries.push(query);
        });

        bundleData.delete.forEach(c => {
            let table = Object.keys(c)[0];
            let query = me.createQueryDelete(table, c[table]);
            queries.push(query);
        });

        this.bulkExecuteWithTransaction(queries, response => {
            if (type != null)
                callback({ [type]: response });
            else
                callback(response);
        });
    }

    createColumns(table) {
        let query = '( ';

        Models[table].forEach((col, i) => {
            query += ` ${col},`;
        });

        query = query.slice(0, -1);
        query += ' )';

        return query;
    }

    createValues(content, table) {
        let query = ' (';

        Models[table].forEach(c => {
            let val = (typeof (content[c]) == "boolean" || Number.isFinite(content[c])) ? content[c] : ((content[c] === undefined || content[c] === null) ? `NULL` : `'${content[c]}'`);
            query += ` ${val},`;
        });

        query = query.slice(0, -1);
        query += ' )'

        return query;
    }

    createWhereClause(content) {
        let keys = Object.keys(content);
        let results = '';

        keys.forEach((c, i) => {
            results += `( ${c} = '${content[c]}' )`;

            if (content[keys[i + 1]])
                results += ' AND ';
        })

        return results;
    }

    createValuesUpdate(content, table) {
        let keys = Object.keys(content);
        let results = '';

        Models[table].forEach((c, i) => {
            if (content[c] === undefined) 
                return;
            let val = (typeof (content[c]) == "boolean" || Number.isFinite(content[c])) ? content[c] : ((content[c] === null) ? `NULL` : `'${content[c]}'`);
            results += ` ${c} = ${val},`;
        })

        results = results
            .slice(0, -1);
        return results;
    }

    getRPJM(kodeDesa, callback) {
        let whereClause = ` WHERE (Ta_RPJM_Bidang.Kd_Desa = '${kodeDesa}') ORDER BY Ta_RPJM_Bidang.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg`;

        this.get(queryRPJM + whereClause, callback);
    }

    getSumberDanaPaguTahunan(regionCode, callback) {
        let whereClause = ` WHERE (Ta_RPJM_Kegiatan.Kd_Desa = '${regionCode}') ORDER BY Ta_RPJM_Kegiatan.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg`;
        this.get(querySumberdanaPaguTahunan + whereClause, callback)
    }

    getRenstraRPJM(idVisi,kodeDesa, tahun, callback) {
        let whereClause = ` WHERE (Ta_RPJM_Visi.ID_Visi = '${idVisi}') AND (Ta_RPJM_Visi.Kd_Desa = '${kodeDesa}') AND (Ta_Desa.Tahun = '${tahun}')`;
        this.get(queryRenstraRPJM + whereClause, callback);
    }

    getVisiRPJM(kdDesa, callback) {
        let whereClause = ` Where (Ta_Desa.Kd_Desa = '${kdDesa}')`
        this.get(queryVisiRPJM + whereClause, callback);
    }

    getRKPByYear(kdDesa, rkp, callback) {
        let whereClause = ` WHERE   (Bid.Kd_Desa = '${kdDesa}') AND (Pagu.Kd_Tahun = 'THN${rkp}') ORDER BY Bid.Kd_Bid,Pagu.Kd_Keg`;
        this.get(queryPaguTahunan + whereClause, callback)
    }

    getRAB(year, regionCode, callback) {
        let queryPendapatan = queryPendAndPemb + ` WHERE (Rek1.Akun = '4.') OR (Rek1.Akun = '6.') AND (Ds.Kd_Desa = '${regionCode}') `
        let queryUnionALL = queryPendapatan + ' UNION ALL ' + queryBelanja + ` WHERE  (Ds.Kd_Desa = '${regionCode}') ORDER BY Rek1.Akun, Bdg.Kd_Bid, Keg.Kd_Keg, Rek3.Jenis, Rek4.Obyek, RABSub.Kd_SubRinci, RABRi.No_Urut`;
        this.get(queryUnionALL, callback)
    }

    getSumAnggaranRAB(kdDesa, callback) {
        let whereClause = ` Where (Ds.Kd_Desa = '${kdDesa}') GROUP BY RAB.Tahun, Rek1.Nama_Akun, Rek2.Akun, Ds.Kd_Desa ORDER BY Rek2.Akun`;
        this.get(querySumRAB + whereClause, callback)
    }

    getDetailSPP(noSPP, callback) {
        let whereClause = ` WHERE  (S.No_SPP = '${noSPP}') ORDER BY SR.Kd_Rincian,SB.Tgl_Bukti, SB.No_Bukti, SPo.Kd_Rincian;`;
        this.get(queryDetailSPP + whereClause, callback);
    }

    getSPP(kodeDesa, callback) {
        let whereClause = `WHERE (Ta_SPP.Kd_Desa = '${kodeDesa}') ORDER BY Ta_SPP.No_SPP`
        this.get(querySPP + whereClause, callback)
    }

    getAllKegiatan(regionCode, callback) {
        let whereClause = ` WHERE  (Ds.Kd_Desa = '${regionCode}')`;
        this.get(queryGetAllKegiatan + whereClause, callback)
    }

    getRABSub(callback) {
        this.get(queryRABSub, callback);
    }

    getKegiatanByCodeRinci(code, callback) {
        let whereClause = ` WHERE  (Ta_RABSub.Kd_Rincian = '${code}')`;
        this.get(queryGetKodeKegiatan + whereClause, callback);
    }

    getRefPotongan(callback) {
        this.get(queryRefPotongan, callback);
    }

    getRefBidangAndKegiatan(regionCode, callback) {
        let whereClause = ` WHERE  (Ta_Desa.Kd_Desa = '${regionCode}')  ORDER BY    Ta_Bidang.Kd_Bid, Ta_Kegiatan.Kd_Keg`;
        this.get(queryGetBidAndKeg + whereClause, callback);
    }

    getRefRekByCode(code, callback) {
        let whereClause = `WHERE (Rek1.Akun = '${code}') ORDER BY Rek1.Akun, Rek2.Kelompok, Rek3.Jenis, Rek4.Obyek`;
        this.get(queryGetRefRek + whereClause, callback);
    }

    getRefRekByKelompok(code, callback) {
        let whereClause = `WHERE (Rek2.Kelompok = '${code}') ORDER BY Rek1.Akun, Rek2.Kelompok, Rek3.Jenis, Rek4.Obyek`;
        this.get(queryGetRefRek + whereClause, callback);
    }

    getRefSumberDana(callback) {
        this.get(queryRefSumberdana, callback)
    }

    getRefKegiatan(callback) {
        this.get(queryRefKegiatan, callback)
    }

    getRefBidang(callback) {
        this.get(queryRefBidang, callback)
    }

    getAllSasaranRenstra(kdDesa, callback) {
        let whereClause = ` WHERE (Kd_Desa = '${kdDesa}') ORDER BY ID_Sasaran`;
        this.get(querySasaran + whereClause, callback)
    }

    getRPJMBidAndKeg(kdDesa, callback) {
        let whereClause = ` WHERE (Ta_RPJM_Bidang.Kd_Desa = '${kdDesa}') ORDER BY Ta_RPJM_Bidang.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg`;
        this.get(queryRPJMBidAndKeg + whereClause, callback)
    }

    getTaDesa(kdDesa, callback) {
        if(!kdDesa)
            kdDesa = settings.data['kodeDesa'];

        let whereClause = ` WHERE   (Ta_Desa.Kd_Desa = '${kdDesa}')`;
        this.get(queryTaDesa + whereClause, callback)
    }

    getPostingLog(kdDesa, callback) {
        let whereClause = ` WHERE (Ta_AnggaranLog.Kd_Desa = '${kdDesa}')`;
        this.get(queryAnggaranLog + whereClause, callback);
    }

    applyFixMultipleMisi(callback) {
        this.execute(queryFixMultipleMisi, callback);
    }

    getPencairanSPP(kdDesa,noSPP, callback){
        let whereClause = ` WHERE (Kd_Desa = '${kdDesa}') AND (No_SPP = '${noSPP}')`;
        this.get(queryPencairanSPP + whereClause, callback);
    }

    getMaxNoSPP(kdDesa, callback){
        let whereClause = ` WHERE (Kd_Desa = '${kdDesa}')`
        this.get(queryGetMaxNoSPP + whereClause, callback);
    }

    getMaxNoBukti(kdDesa, callback){
        let whereClause = ` WHERE (Kd_Desa = '${kdDesa}')`
        this.get(queryGetMaxNoBukti + whereClause, callback);
    }

    getMaxNoTBP(callback){
        let kodeDesa = settings.data['kodeDesa'];
        let whereClause = ` WHERE (Kd_Desa = '${kodeDesa}')`;
        this.get(queryGetMaxNoTBP + whereClause, callback);
    }

    getMaxNoSTS(callback){
        let kodeDesa = settings.data['kodeDesa'];
        let whereClause = ` WHERE (Kd_Desa = '${kodeDesa}')`;
        this.get(queryGetMaxSTS + whereClause, callback);
    }

    getPenerimaan(kodeBayar, callback){
        let kodeDesa = settings.data['kodeDesa'];
        let whereClause = ` WHERE (Ta_TBP.Kd_Desa = '${kodeDesa}') AND (Ta_TBP.KdBayar = ${kodeBayar})`;

        this.get(queryPenerimaan + whereClause, callback);
    }

    getPenyetoran(callback){
        let kodeDesa = settings.data['kodeDesa'];
        let whereClause = ` WHERE (Ta_STS.Kd_Desa = '${kodeDesa}')`;

        this.get(queryPenyetoran + whereClause, callback);
    }

    getRincianTBP(tahun, kodeDesa, callback){
        let whereClause = ` HAVING (((A.Tahun)='${tahun}') AND ((A.Kd_Desa)='${kodeDesa}') AND ((A.Kd_Rincian) Like '4%') OR (A.Kd_Rincian LIKE '6.1%'))`
        this.get(queryRincianTBP + whereClause, callback)
    }

    getSisaAnggaranRAB(tahun, kdDesa, kdKeg, tglSPP, kdPosting, callback) {        
        let query = `SELECT Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Nama_Rincian, SumberDana, SUM(JmlAnggaran) AS Sisa 
                    FROM ( SELECT        A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek AS Nama_Rincian, A.SumberDana, SUM(A.Anggaran) AS JmlAnggaran, C.Tgl_Perdes
                        FROM            ((Ta_Anggaran A INNER JOIN
                                                Ref_Rek4 B ON A.Kd_Rincian = B.Obyek) INNER JOIN
                                                Ta_Desa C ON A.Tahun = C.Tahun AND A.Kd_Desa = C.Kd_Desa)
                        WHERE        (A.Tahun = '${tahun}') AND (A.Kd_Desa = '${kdDesa}') AND (A.Kd_Keg = '${kdKeg}') AND (A.TglPosting <= #${tglSPP}#) AND (A.KdPosting = '${kdPosting}')
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek, A.SumberDana, C.Tgl_Perdes
                        UNION ALL
                        SELECT        A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek AS Nama_Rincian, A.SumberDana, SUM(A.AnggaranPAK) AS JmlAnggaran, C.Tgl_Perdes_PB
                        FROM            ((Ta_Anggaran A INNER JOIN
                                                Ref_Rek4 B ON A.Kd_Rincian = B.Obyek) INNER JOIN
                                                Ta_Desa C ON A.Tahun = C.Tahun AND A.Kd_Desa = C.Kd_Desa)
                        WHERE        (A.Tahun = '${tahun}') AND (A.Kd_Desa = '${kdDesa}') AND (A.Kd_Keg = '${kdKeg}') AND (A.TglPosting <= #${tglSPP}#) AND (A.KdPosting = '99')
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek, A.SumberDana, C.Tgl_Perdes_PB
                        UNION ALL
                        SELECT        A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek AS Nama_Rincian, A.Sumberdana, SUM(- A.Nilai) AS JmlAnggaran, C.Tgl_SPP
                        FROM            ((Ta_SPP C INNER JOIN
                                                (Ta_SPPRinci A INNER JOIN
                                                Ref_Rek4 B ON A.Kd_Rincian = B.Obyek) ON C.No_SPP = A.No_SPP) LEFT OUTER JOIN
                                                Ta_SPJ D ON C.No_SPP = D.No_SPP)
                        WHERE        (A.Tahun = '${tahun}') AND (A.Kd_Desa = '${kdDesa}') AND (A.Kd_Keg = '${kdKeg}') AND (D.No_SPJ IS NULL)
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek, A.Sumberdana, C.Tgl_SPP
                        UNION ALL
                        SELECT        A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek AS Nama_Rincian, A.Sumberdana, SUM(- A.Nilai) AS JmlAnggaran, C.Tgl_SPJ
                        FROM            ((Ta_SPJRinci A INNER JOIN
                                                Ref_Rek4 B ON A.Kd_Rincian = B.Obyek) INNER JOIN
                                                Ta_SPJ C ON A.No_SPJ = C.No_SPJ)
                        WHERE        (A.Tahun = '${tahun}') AND (A.Kd_Desa = '${kdDesa}') AND (A.Kd_Keg = '${kdKeg}')
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek, A.Sumberdana, C.Tgl_SPJ
                        ) AS DrvA GROUP BY Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Nama_Rincian, SumberDana ORDER BY Kd_Rincian`
        this.get(query , callback);
    }

    postingAPBDes(kdDesa, model, statusAPBDES, callback) {
        let queries = [];
        let queryUpdateTaDesa = (statusAPBDES == 'AWAL') ? 
            `UPDATE Ta_Desa SET No_Perdes = '${model.No_Perdes}', Tgl_Perdes = '${model.TglPosting}', No_Perdes_PB = '${model.No_Perdes}', Tgl_Perdes_PB = '${model.TglPosting}' ` :
            `UPDATE Ta_Desa SET No_Perdes_PB = '${model.No_Perdes}', Tgl_Perdes_PB = '${model.TglPosting}' `

        let queryInsertTaAnggaran = `INSERT INTO Ta_Anggaran ( KdPosting, Tahun, KURincianSD, Kd_Rincian, RincianSD, Anggaran, AnggaranStlhPAK, AnggaranPAK, Belanja, Kd_Keg, SumberDana, Kd_Desa, TglPosting )
                                    SELECT  '${model.KdPosting}', Tahun, [Ta_RABRinci.Kd_Keg] & [Ta_RABRinci.Kd_Rincian] & [Ta_RABRinci.SumberDana] AS KURincianSD, Kd_Rincian, [Ta_RABRinci.Kd_Rincian] & [Ta_RABRinci.SumberDana] AS RincianSD, 
                                    SUM(JmlSatuan * HrgSatuan) AS Anggaran,SUM(JmlSatuanPAK * HrgSatuanPAK) AS AnggaranStlhPAK,SUM(JmlSatuanPAK * HrgSatuanPAK)-SUM(JmlSatuan * HrgSatuan) AS AnggaranPAK, IIF(Kd_Rincian < '5.', 'PDPT', (IIF(Kd_Rincian < '6.','BOP','PBY'))) AS Belanja, Kd_Keg, SumberDana, Kd_Desa, '${model.TglPosting}'
                                    FROM   Ta_RABRinci `

        queries.push(`DELETE FROM Ta_Anggaran WHERE KdPosting = '${model.KdPosting}';`,
            `DELETE FROM Ta_AnggaranLog WHERE KdPosting = '${model.KdPosting}';`,
            `DELETE FROM Ta_AnggaranRinci WHERE KdPosting = '${model.KdPosting}';`,
            `${queryUpdateTaDesa} WHERE (Kd_Desa = '${kdDesa}');`,
            `${queryInsertTaAnggaran} WHERE  (Kd_Desa = '${kdDesa}') GROUP BY Tahun, Kd_Keg, Kd_Rincian, Kd_Desa, SumberDana`,
            `INSERT INTO Ta_AnggaranLog (KdPosting, Tahun, Kd_Desa, No_Perdes, TglPosting, Kunci) VALUES ('${model.KdPosting}', '${model.Tahun}', '${kdDesa}', '${model.No_Perdes}', '${model.TglPosting}', false);`,
            `INSERT INTO Ta_AnggaranRinci (Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Kd_SubRinci, No_Urut, SumberDana, Uraian, Satuan, JmlSatuan, HrgSatuan, Anggaran, JmlSatuanPAK, HrgSatuanPAK, AnggaranStlhPAK, KdPosting)
                      SELECT Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Kd_SubRinci, No_Urut, SumberDana, Uraian, Satuan, JmlSatuan, HrgSatuan, Anggaran, JmlSatuanPAK, HrgSatuanPAK, AnggaranStlhPAK,  ${model.KdPosting} 
                      FROM Ta_RABRinci WHERE (Kd_Desa = '${kdDesa}');`);

        this.bulkExecuteWithTransaction(queries, callback);
    }

    updateSPPRinci(noSPP, kdKeg, callback){
        let query =  `SELECT  SUM(Nilai) AS Nilai, No_SPP, Kd_Rincian, Kd_Keg FROM  Ta_SPPBukti WHERE   (No_SPP = '${noSPP}') AND (Kd_Keg = '${kdKeg}') GROUP BY No_SPP, Kd_Rincian, Kd_Keg`;
        this.get(query, data =>{
            let results = [];            
            data.forEach(c => {
                let query = `UPDATE Ta_SPPRinci Set Ta_SPPRinci.Nilai = ${c.Nilai} WHERE (Ta_SPPRinci.No_SPP = '${c.No_SPP}') AND (Ta_SPPRinci.Kd_Keg = '${c.Kd_Keg}')`
                results.push(query)
            })
            this.bulkExecuteWithTransaction(results, response =>{
                this.updateSPP(noSPP, results =>{
                    console.log('Status Update Ta_SPPRinci',response);
                    console.log('Status Update Ta_SPP',results);
                    callback(response)
                })                
            })
        })
    }
    
    updateSPP(noSPP, callback ){
        let query = `SELECT Ta_SPPRinci.No_SPP, SUM(Ta_SPPRinci.Nilai) AS Jumlah, IIF(SUM(Ta_SPPPot.Nilai) is null, 0,SUM(Ta_SPPPot.Nilai))  AS Potongan
                    FROM    (Ta_SPPRinci LEFT OUTER JOIN  Ta_SPPPot ON Ta_SPPRinci.No_SPP = Ta_SPPPot.No_SPP)                    
                    WHERE (Ta_SPPRinci.No_SPP = '${noSPP}')
                    GROUP BY Ta_SPPRinci.No_SPP`

        this.get(query, data =>{
            let results = [];            
            data.forEach(c => {
                let query = `UPDATE Ta_SPP Set Ta_SPP.Jumlah = ${c.Jumlah}, Ta_SPP.Potongan = ${c.Potongan} WHERE (Ta_SPP.No_SPP = '${c.No_SPP}')`
                results.push(query)
            })
            this.bulkExecuteWithTransaction(results, response =>{
                callback(response)
            })
        })
                
    }

    createQueryInsert(table, content) {
        let columns = this.createColumns(table);
        let values = this.createValues(content, table);

        return `INSERT INTO ${table} ${columns} VALUES ${values}`;
    }

    createQueryUpdate(table, content) {
        let values = this.createValuesUpdate(content.data, table);
        let whereClause = this.createWhereClause(content.whereClause);

        return `UPDATE ${table} SET ${values} WHERE ${whereClause}`;
    }

    createQueryDelete(table, content) {
        let whereClause = this.createWhereClause(content.whereClause);

        return `DELETE FROM ${table} WHERE ${whereClause}`;
    }
    
    getAllDesa(fileName, callback){
        let config = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + fileName;
        let connection = ADODB.open(config); 

        let query = `SELECT Ta_Desa.Kd_Desa, Ref_Desa.Nama_Desa FROM Ref_Kecamatan INNER JOIN (Ref_Desa INNER JOIN Ta_Desa ON Ref_Desa.Kd_Desa = Ta_Desa.Kd_Desa) ON Ref_Kecamatan.Kd_Kec = Ref_Desa.Kd_Kec; `
        
        connection
            .query(query)
            .on('done', function (data) {
                callback(data);
            })
            .on('fail', function (error) {
                callback(error);
            });
    }
}
