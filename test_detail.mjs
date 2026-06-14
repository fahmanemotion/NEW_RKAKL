import { computeVolume, computeJumlah, effectiveVolume } from './src/lib/detail-volume.ts';
import { JENIS_BELANJA } from './src/lib/constants.ts';
let pass=0, fail=0; const ok=(c,m)=>{c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m));};

// Volume bertingkat
let r = computeVolume([{qty:10,sat:'Orang'},{qty:3,sat:'Hari'},{qty:'',sat:''},{qty:'',sat:''}]);
ok(r.volume===30 && r.satuan==='Orang x Hari','10 Orang x 3 Hari = 30, "Orang x Hari"');

r = computeVolume([{qty:5,sat:'OK'},{qty:'',sat:''},{qty:'',sat:''},{qty:'',sat:''}]);
ok(r.volume===5 && r.satuan==='OK','satu segmen: 5 OK');

r = computeVolume([{qty:2,sat:'Org'},{qty:4,sat:'Hari'},{qty:3,sat:'Keg'},{qty:'',sat:''}]);
ok(r.volume===24 && r.satuan==='Org x Hari x Keg','tiga segmen 2x4x3=24');

r = computeVolume([{qty:'',sat:''},{qty:'',sat:''},{qty:'',sat:''},{qty:'',sat:''}]);
ok(r.volume===0 && r.satuan==='','semua kosong → 0');

r = computeVolume([{qty:0,sat:'X'},{qty:7,sat:'Bulan'},{qty:'',sat:''},{qty:'',sat:''}]);
ok(r.volume===7 && r.satuan==='Bulan','qty 0 diabaikan, sisanya 7 Bulan');

r = computeVolume([{qty:2.5,sat:'Ton'},{qty:2,sat:'Rit'},{qty:'',sat:''},{qty:'',sat:''}]);
ok(r.volume===5 && r.satuan==='Ton x Rit','desimal: 2.5 x 2 = 5');

r = computeVolume([{qty:3,sat:''},{qty:4,sat:'Hari'},{qty:'',sat:''},{qty:'',sat:''}]);
ok(r.volume===12 && r.satuan==='Hari','segmen tanpa satuan tetap dihitung, satuan diabaikan');

// Jumlah = volume x harga
ok(computeJumlah(30,150000)===4500000,'jumlah 30 x 150.000 = 4.500.000');
ok(computeJumlah(0,150000)===0,'jumlah 0 bila volume 0');
ok(computeJumlah(2.5,1000)===2500,'jumlah desimal 2.5 x 1000');

// Jenis belanja: OPS / NON_OPS, tanpa sumber dana
ok(JENIS_BELANJA.length===2 && JENIS_BELANJA[0].value==='OPS' && JENIS_BELANJA[1].value==='NON_OPS','jenis belanja OPS & NON_OPS');
ok(!JENIS_BELANJA.some(j=>/RM|BLU|SBSN/.test(j.value)),'tidak ada sumber dana di pilihan jenis belanja');

// Satkeg kini diisi manual user → satuan TIDAK boleh mempengaruhi volume/jumlah.
const vA = computeVolume([{qty:10,sat:'Orang'},{qty:3,sat:'Hari'},{qty:'',sat:''},{qty:'',sat:''}]).volume;
const vB = computeVolume([{qty:10,sat:'XXX'},{qty:3,sat:''},{qty:'',sat:''},{qty:'',sat:''}]).volume;
ok(vA===vB && vA===30,'volume sama meski teks satuan berbeda (Satkeg manual aman)');
ok(computeJumlah(vA,150000)===4500000,'jumlah tetap dari volume x harga, lepas dari Satkeg');

// Dua mode Volkeg: manual vs rincian (ala SAKTI)
const segs = [{qty:100,sat:'org'},{qty:2,sat:'keg'},{qty:'',sat:''},{qty:'',sat:''}];
ok(effectiveVolume(false, 5, segs)===5,'mode manual: Volkeg = angka manual (5)');
ok(effectiveVolume(false, '', segs)===0,'mode manual kosong → 0');
ok(effectiveVolume(true, 5, segs)===200,'mode rincian: Volkeg = 100 x 2 = 200 (abaikan manual)');
ok(effectiveVolume(true, 999, [{qty:'',sat:''},{qty:'',sat:''},{qty:'',sat:''},{qty:'',sat:''}])===0,'mode rincian tanpa segmen → 0');
ok(computeJumlah(effectiveVolume(false,3,segs),1000)===3000,'jumlah dari Volkeg manual 3 x 1000');

console.log('\nHasil: '+pass+' lulus, '+fail+' gagal'); process.exit(fail?1:0);
