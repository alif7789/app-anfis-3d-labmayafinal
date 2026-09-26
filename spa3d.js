/* =====================================================================
   LABORATORIUM MAYA 3D — RUANG PRAKTIK SPA
   Seluruh isi ruangan dibangun lewat kode: geometri dasar Three.js yang
   disudutbulatkan, ditambah tekstur yang digambar ke <canvas> saat jalan.
   Tidak ada berkas model atau gambar yang perlu dimuat.

   Susunan berkas ini:
     1. Alat bantu & tekstur prosedural
     2. Penyaji (renderer), panggung, kamera, pencahayaan
     3. Cangkang ruangan — lantai, dinding, langit-langit, jendela
     4. Perabot — meja perawatan, trolly, meja lilin, rak, tanaman
     5. Partikel — uap, debu cahaya
     6. Hotspot menu & koreografi kamera
     7. Suara dan antarmuka
   ===================================================================== */
'use strict';
const T = THREE;

/* ---------- 1. ALAT BANTU ---------- */
const acak  = (a,b)=>a+Math.random()*(b-a);
const jepit = (v,a,b)=>Math.max(a,Math.min(b,v));
const RUANG = {lebar:7.2, tinggi:3.1, dalam:8.0};
const MUTU  = {
  bayang: Math.min(window.devicePixelRatio||1,2)>1.5 && window.innerWidth>900 ? 2048 : 1024,
  uap:    window.innerWidth>900 ? 150 : 80,
  debu:   window.innerWidth>900 ? 150 : 80
};
const animasi = [];                     /* fungsi yang dipanggil tiap frame */
const perlu   = f=>animasi.push(f);

function kanvas(w,h,gambar){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  gambar(c.getContext('2d'),w,h); return c;
}
function tekstur(c,rx=1,ry=1,warnaSRGB=true){
  const t=new T.CanvasTexture(c);
  t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(rx,ry);
  t.colorSpace = warnaSRGB ? T.SRGBColorSpace : T.NoColorSpace;
  t.anisotropy = 8;
  return t;
}
/* Kotak bersudut tumpul — tepi yang dibevel menangkap kilau cahaya
   sehingga benda tidak terlihat seperti balok datar. */
function bentukBulat(w,h,r){
  const s=new T.Shape(), x=-w/2, y=-h/2;
  s.moveTo(x+r,y);
  s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
  return s;
}
function kotakBulat(w,h,d,r=.04,seg=3){
  r=Math.min(r,w/2-.002,h/2-.002,d/2-.002);
  const g=new T.ExtrudeGeometry(bentukBulat(w,h,r),{
    depth:Math.max(d-2*r,.001), bevelEnabled:true, bevelThickness:r,
    bevelSize:r, bevelSegments:seg, curveSegments:seg*3});
  g.translate(0,0,-(d-2*r)/2);
  g.computeVertexNormals();
  return g;
}
function silinder(rAtas,rBawah,t,seg=24){ return new T.CylinderGeometry(rAtas,rBawah,t,seg); }

/* Mengganti gambar sebuah tekstur kanvas SELALU lewat tekstur baru, tidak
   dengan menukar `.image` di tempat: regenerasi mipmap pada tekstur yang
   ditukar isinya menghasilkan mip yang rusak — terlihat sebagai blok-blok
   robek dan pola dither pada permukaan yang mengecil (mis. cermin). */
function gantiTekstur(mesh, kanvasBaru){
  const lama=mesh.material.map;
  const baru=tekstur(kanvasBaru,1,1);
  mesh.material.map=baru;
  if(mesh.material.emissiveMap) mesh.material.emissiveMap=baru;
  mesh.material.needsUpdate=true;
  if(lama) lama.dispose();
}

/* ---------- 1b. TEKSTUR PROSEDURAL ---------- */
function texKayu(){
  return kanvas(1024,1024,(x,w,h)=>{
    const papan=7, ph=h/papan;
    for(let i=0;i<papan;i++){
      const y=i*ph, l=acak(-16,16);
      x.fillStyle=`rgb(${104+l},${66+l*.7},${38+l*.5})`;
      x.fillRect(0,y,w,ph);
      for(let g=0;g<80;g++){                       /* serat kayu */
        x.strokeStyle=`rgba(${44+acak(0,44)},${26+acak(0,26)},${12+acak(0,16)},${acak(.05,.22)})`;
        x.lineWidth=acak(.5,2.4); x.beginPath();
        let yy=y+acak(2,ph-3), xx=0; x.moveTo(0,yy);
        while(xx<w){ xx+=acak(28,86); yy+=acak(-2.4,2.4); x.lineTo(xx,yy); }
        x.stroke();
      }
      for(let k=0;k<3;k++){                        /* mata kayu */
        const cx=acak(0,w), cy=y+acak(6,ph-6);
        for(let r=2;r<acak(9,20);r+=2){
          x.strokeStyle=`rgba(48,28,12,${acak(.08,.2)})`; x.lineWidth=1.3;
          x.beginPath(); x.ellipse(cx,cy,r*1.7,r,acak(0,3),0,7); x.stroke();
        }
      }
      x.fillStyle='rgba(18,9,3,.6)'; x.fillRect(0,y+ph-2.5,w,2.5);   /* celah papan */
    }
    for(let s=1;s<4;s++){                          /* sambungan melintang */
      const sx=s*w/4+acak(-40,40);
      x.fillStyle='rgba(18,9,3,.45)'; x.fillRect(sx,0,2.5,h);
    }
  });
}
function texKayuKasar(){
  return kanvas(512,512,(x,w,h)=>{
    x.fillStyle='#8a8a8a'; x.fillRect(0,0,w,h);
    for(let i=0;i<2600;i++){
      const v=acak(.35,1);
      x.fillStyle=`rgba(255,255,255,${acak(.03,.12)})`;
      x.fillRect(acak(0,w),acak(0,h),acak(10,80)*v,acak(.6,2));
    }
  });
}
function texPlester(dasar){
  return kanvas(512,512,(x,w,h)=>{
    x.fillStyle=dasar; x.fillRect(0,0,w,h);
    for(let i=0;i<900;i++){
      const r=acak(6,54), a=acak(.012,.05);
      x.fillStyle=Math.random()<.5?`rgba(255,235,220,${a})`:`rgba(70,32,26,${a})`;
      x.beginPath(); x.arc(acak(0,w),acak(0,h),r,0,7); x.fill();
    }
    for(let i=0;i<5000;i++){                        /* butir halus plester */
      x.fillStyle=`rgba(0,0,0,${acak(.01,.05)})`;
      x.fillRect(acak(0,w),acak(0,h),1,1);
    }
  });
}
function texKain(dasar){
  return kanvas(512,512,(x,w,h)=>{
    x.fillStyle=dasar; x.fillRect(0,0,w,h);
    for(let i=0;i<w;i+=3){
      x.fillStyle=`rgba(255,255,255,${acak(.03,.09)})`; x.fillRect(i,0,1.4,h);
      x.fillStyle=`rgba(0,0,0,${acak(.02,.06)})`;       x.fillRect(0,i,w,1.4);
    }
    for(let i=0;i<1400;i++){
      x.fillStyle=`rgba(0,0,0,${acak(.01,.04)})`;
      x.fillRect(acak(0,w),acak(0,h),acak(1,3),acak(1,3));
    }
  });
}
function texLuar(){
  return kanvas(256,256,(x,w,h)=>{
    const g=x.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#fffaf0'); g.addColorStop(.42,'#ffeed2');
    g.addColorStop(.7,'#e3e8c2'); g.addColorStop(1,'#b9c99a');
    x.fillStyle=g; x.fillRect(0,0,w,h);
    for(let i=0;i<46;i++){                        /* dedaunan buram di luar */
      x.fillStyle=`rgba(${acak(96,152)|0},${acak(132,178)|0},${acak(72,112)|0},${acak(.05,.2)})`;
      x.beginPath(); x.ellipse(acak(0,w),acak(h*.45,h*1.05),acak(12,48),acak(8,30),acak(0,3),0,7); x.fill();
    }
  });
}
function texBulat(){
  return kanvas(128,128,(x,w,h)=>{
    const g=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.35,'rgba(255,255,255,.5)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=g; x.fillRect(0,0,w,h);
  });
}
function texKilau(){                                /* cahaya lembut untuk nyala lilin */
  return kanvas(256,256,(x,w,h)=>{
    const g=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    g.addColorStop(0,'rgba(255,236,190,.95)'); g.addColorStop(.22,'rgba(255,178,80,.55)');
    g.addColorStop(.55,'rgba(255,132,40,.16)'); g.addColorStop(1,'rgba(255,120,30,0)');
    x.fillStyle=g; x.fillRect(0,0,w,h);
  });
}

/* Dipakai bersama oleh partikel uap/debu dan bayangan kontak mentor. Sengaja
   dideklarasikan di sini, bukan di bagian PARTIKEL: pemuat tekstur mentor
   berjalan asinkron dan bisa menembak sebelum baris itu sempat dieksekusi. */
const texTitik=tekstur(texBulat(),1,1);

/* ---------- 2. PENYAJI, PANGGUNG, KAMERA ---------- */
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;   /* kunci kesan "foto", bukan kartun */
renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene=new T.Scene();
scene.fog=new T.FogExp2(0x2a1c1e,.026);

const camera=new T.PerspectiveCamera(46,innerWidth/innerHeight,.08,60);
camera.position.set(.15,1.30,5.9);

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

/* Peta lingkungan dibuat dari panggung kecil berisi bidang-bidang bercahaya.
   Inilah yang memberi pantulan lembut pada logam trolly dan botol kaca. */
function buatLingkungan(){
  const pm=new T.PMREMGenerator(renderer); pm.compileEquirectangularShader();
  const s=new T.Scene();
  const sisi=(w,h,d,warna,kuat,pos,rot)=>{
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),
      new T.MeshBasicMaterial({color:warna,side:T.BackSide}));
    m.position.set(...pos); if(rot) m.rotation.set(...rot);
    m.material.color.multiplyScalar(kuat); s.add(m);
  };
  sisi(9,4,10,0x3a2620,1.0,[0,1.6,0]);                        /* kotak ruangan */
  const cahaya=(w,h,warna,kuat,pos,rot)=>{
    const m=new T.Mesh(new T.PlaneGeometry(w,h),
      new T.MeshBasicMaterial({color:new T.Color(warna).multiplyScalar(kuat)}));
    m.position.set(...pos); m.rotation.set(...rot); s.add(m);
  };
  cahaya(6,5,0xffd9a6,4.2,[0,3.55,0],[Math.PI/2,0,0]);        /* langit-langit hangat */
  cahaya(4,2.6,0xdce9ff,7.5,[-4.4,1.7,.6],[0,Math.PI/2,0]);   /* cahaya jendela */
  cahaya(5,1.2,0xffb066,3.0,[0,.6,-4.4],[0,0,0]);             /* pantulan lilin */
  cahaya(9,10,0x241611,1.0,[0,-.05,0],[-Math.PI/2,0,0]);      /* lantai gelap */
  const rt=pm.fromScene(s,.035);
  scene.environment=rt.texture;
  scene.environmentIntensity=.85;
  pm.dispose();
}
buatLingkungan();

/* ---------- pencahayaan ---------- */
const langit=new T.HemisphereLight(0xffe3c2,0x2a1a16,.34); scene.add(langit);

/* sinar matahari sore dari jendela kiri — sumber bayangan utama */
const matahari=new T.DirectionalLight(0xffd9b2,2.75);
matahari.position.set(-7.5,3.4,1.9);
matahari.target.position.set(.4,.7,-1.2);
matahari.castShadow=true;
matahari.shadow.mapSize.set(MUTU.bayang,MUTU.bayang);
matahari.shadow.camera.left=-5.5; matahari.shadow.camera.right=5.5;
matahari.shadow.camera.top=4; matahari.shadow.camera.bottom=-1;
matahari.shadow.camera.near=1; matahari.shadow.camera.far=18;
matahari.shadow.bias=-.0009; matahari.shadow.normalBias=.022;
scene.add(matahari,matahari.target);

/* lampu gantung — kunci hangat di atas meja perawatan */
const gantung=new T.SpotLight(0xffc98a,26,7.5,.72,.62,1.6);
gantung.position.set(-.35,2.42,-1.0);
gantung.target.position.set(-.4,.75,-1.0);
gantung.castShadow=true;
gantung.shadow.mapSize.set(MUTU.bayang,MUTU.bayang);
gantung.shadow.bias=-.0012; gantung.shadow.normalBias=.02;
scene.add(gantung,gantung.target);

/* isian dingin dari arah pintu supaya bayangan tidak mati total */
const isian=new T.PointLight(0xa9bcd8,3.4,12,2); isian.position.set(2.1,2.0,3.4);
scene.add(isian);
/* limpahan cahaya dingin tepat di mulut jendela — pasangan kontras bagi
   lampu gantung yang hangat; inilah yang membuat ruangan terasa berdimensi */
const jendelaIsian=new T.PointLight(0xbcd6ff,3.4,8,2);
jendelaIsian.position.set(-2.35,1.68,.7); scene.add(jendelaIsian);

/* pantulan balik dari lantai & langit-langit — tanpa ini langit-langit mati gelap */
const pantul=new T.PointLight(0xffd7b4,2.4,9,1.6); pantul.position.set(0,2.55,.2);
scene.add(pantul);

/* ---------- 3. CANGKANG RUANGAN ---------- */
const matLantai=new T.MeshStandardMaterial({
  map:tekstur(texKayu(),3,6), roughnessMap:tekstur(texKayuKasar(),4,7,false),
  roughness:.62, metalness:.02, color:0xffffff});
const matDinding=new T.MeshStandardMaterial({
  map:tekstur(texPlester('#c7a08c'),7,3), roughness:.96, metalness:0});
const matDindingBelakang=new T.MeshStandardMaterial({
  map:tekstur(texPlester('#bb8d7c'),6,3), roughness:.96, metalness:0});
const matLangit=new T.MeshStandardMaterial({color:0xf0e2d4,roughness:.98,metalness:0,
  emissive:0x3b2a24,emissiveIntensity:1});
const matKayuGelap=new T.MeshStandardMaterial({color:0xbe9268,roughness:.5,metalness:.03,
  map:tekstur(texKayu(),1.4,1.4)});
const matKrom=new T.MeshStandardMaterial({color:0xdfe3e6,roughness:.18,metalness:.95});
/* Bingkai televisi layar datar. Dipakai bersama oleh ruang pengantar, ruang
   materi dan ruang hasil, jadi harus dideklarasikan SEBELUM pembangun ruangan
   dijalankan — lihat catatan urutan inisialisasi di index.html. */
const matBezel=new T.MeshStandardMaterial({color:0x1b181d,roughness:.3,metalness:.55});
const matHanduk=new T.MeshStandardMaterial({map:tekstur(texKain('#f6f1e8'),2,2),roughness:.94,metalness:0});
const matKainKrem=new T.MeshStandardMaterial({map:tekstur(texKain('#e9dcc6'),2,2),roughness:.92,metalness:0});

function dinding(w,h,mat,pos,rot){
  const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);
  m.position.set(...pos); if(rot)m.rotation.set(...rot);
  m.receiveShadow=true; scene.add(m); return m;
}
function buatRuang(){
  const L=RUANG.lebar, D=RUANG.dalam, H=RUANG.tinggi;
  const lantai=new T.Mesh(new T.PlaneGeometry(L,D),matLantai);
  lantai.rotation.x=-Math.PI/2; lantai.receiveShadow=true; scene.add(lantai);

  dinding(L,H,matDindingBelakang,[0,H/2,-D/2]);
  dinding(D,H,matDinding,[-L/2,H/2,0],[0,Math.PI/2,0]);
  dinding(D,H,matDinding,[ L/2,H/2,0],[0,-Math.PI/2,0]);
  dinding(L,H,matDinding,[0,H/2, D/2],[0,Math.PI,0]);
  dinding(L,D,matLangit,[0,H,0],[Math.PI/2,0,0]);

  /* plint kayu di kaki dinding */
  const plint=(w,pos,rot)=>{
    const m=new T.Mesh(kotakBulat(w,.13,.05,.015),matKayuGelap);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.castShadow=m.receiveShadow=true; scene.add(m);
  };
  plint(L,[0,.065,-D/2+.03]);
  plint(D,[-L/2+.03,.065,0],[0,Math.PI/2,0]);
  plint(D,[ L/2-.03,.065,0],[0,-Math.PI/2,0]);

  /* lis cove di dekat langit-langit + garis cahaya tersembunyi */
  const lis=new T.Mesh(kotakBulat(L,.1,.09,.02),
    new T.MeshStandardMaterial({color:0xe8d9c6,roughness:.9}));
  lis.position.set(0,H-.16,-D/2+.06); scene.add(lis);
  const cove=new T.Mesh(new T.PlaneGeometry(L-.4,.1),
    new T.MeshBasicMaterial({color:0xffcf95,transparent:true,opacity:.85}));
  cove.position.set(0,H-.09,-D/2+.02); scene.add(cove);
}
buatRuang();

/* ---------- jendela + berkas cahaya ---------- */
function buatJendela(){
  const x=-RUANG.lebar/2, g=new T.Group(); g.position.set(x+.03,1.65,.7);
  g.rotation.y=Math.PI/2; scene.add(g);

  const kacaW=2.3, kacaH=1.7;
  const kaca=new T.Mesh(new T.PlaneGeometry(kacaW,kacaH),
    new T.MeshBasicMaterial({map:tekstur(texLuar(),1,1)}));
  kaca.material.color.setScalar(1.45);   /* di atas 1 supaya terbaca silau, */
  kaca.position.z=-.02; g.add(kaca);     /* tetapi tidak putih rata          */

  const bingkaiMat=new T.MeshStandardMaterial({color:0xf2ece2,roughness:.6,metalness:.02});
  const bilah=(w,h,px,py)=>{
    const m=new T.Mesh(kotakBulat(w,h,.09,.012),bingkaiMat);
    m.position.set(px,py,.04); m.castShadow=true; g.add(m);
  };
  bilah(kacaW+.22,.12, 0, kacaH/2+.06);
  bilah(kacaW+.22,.12, 0,-kacaH/2-.06);
  bilah(.12,kacaH+.24,-kacaW/2-.05,0);
  bilah(.12,kacaH+.24, kacaW/2+.05,0);
  bilah(.06,kacaH,0,0); bilah(kacaW,.06,0,0);          /* kusen silang */

  /* tirai tipis yang bergoyang pelan */
  const tirai=new T.MeshStandardMaterial({color:0xfff6ea,roughness:1,transparent:true,
    opacity:.34,side:T.DoubleSide});
  [-1,1].forEach(s=>{
    const t=new T.Mesh(new T.PlaneGeometry(.75,kacaH+.35,10,10),tirai);
    t.position.set(s*(kacaW/2-.18),-.06,.11); g.add(t);
    const asal=t.geometry.attributes.position.array.slice();
    perlu(w=>{
      const p=t.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const ay=asal[i*3+1];
        p.setZ(i, Math.sin(w*1.1+ay*2.4+s)*.045*(0.5+ (ay+kacaH/2)/kacaH));
      }
      p.needsUpdate=true;
    });
  });

  /* kabut cahaya yang masuk lewat jendela — dibuat dari beberapa sprite
     lembut, bukan geometri, supaya tidak pernah memperlihatkan tepi keras */
  const texKabut=tekstur(texKilau(),1,1);
  const awal=new T.Vector3(-3.35,1.78,.7), akhir=new T.Vector3(.75,.28,.72);
  for(let i=0;i<5;i++){
    const t=.1+i*.19;
    const sp=new T.Sprite(new T.SpriteMaterial({map:texKabut,color:0xffd9a2,
      transparent:true,opacity:.05,blending:T.AdditiveBlending,depthWrite:false,fog:false}));
    sp.position.lerpVectors(awal,akhir,t);
    const besar=.85+t*2.1;
    sp.scale.set(besar,besar,1);
    sp.renderOrder=2; scene.add(sp);
    const dasar=.062-t*.036, fase=i*1.3;
    perlu(w=>sp.material.opacity=Math.max(0,dasar+Math.sin(w*.4+fase)*.012));
  }
}
buatJendela();

/* ---------- sekat bambu di dinding belakang ---------- */
function buatBambu(){
  const g=new T.Group(); g.position.set(-.55,0,-RUANG.dalam/2+.22); scene.add(g);
  const matBambu=new T.MeshStandardMaterial({color:0x7f9a45,roughness:.58,metalness:.02});
  const matRuas =new T.MeshStandardMaterial({color:0x627a33,roughness:.6});
  for(let i=0;i<15;i++){
    const x=(i-7)*.19, t=acak(2.35,2.62), r=acak(.036,.05);
    const b=new T.Mesh(silinder(r,r*1.05,t,10),matBambu);
    b.position.set(x,t/2,acak(-.03,.03)); b.rotation.z=acak(-.012,.012);
    b.castShadow=b.receiveShadow=true; g.add(b);
    for(let y=acak(.3,.6); y<t-.1; y+=acak(.42,.62)){
      const c=new T.Mesh(silinder(r*1.16,r*1.16,.028,10),matRuas);
      c.position.set(x,y,b.position.z); g.add(c);
    }
  }
  /* cahaya hangat dari balik sekat */
  const balik=new T.Mesh(new T.PlaneGeometry(2.48,2.62),
    new T.MeshBasicMaterial({color:0xd98f4e,transparent:true,opacity:.26}));
  balik.position.set(-.55,1.35,-RUANG.dalam/2+.05); scene.add(balik);
}
buatBambu();

/* ---------- 4. PERABOT ---------- */
const menuObjek={};        /* benda yang menjadi tujuan hotspot menu */

/* meja perawatan (massage bed) */
function buatBed(){
  const g=new T.Group(); g.position.set(-.5,0,-1.15); g.rotation.y=.07; scene.add(g);
  const P=2.05, L=.78, tinggi=.64;

  const rangka=new T.Mesh(kotakBulat(P,.1,L,.03),matKayuGelap);
  rangka.position.y=tinggi; rangka.castShadow=rangka.receiveShadow=true; g.add(rangka);

  const kasur=new T.Mesh(kotakBulat(P-.04,.17,L-.03,.07),matKainKrem);
  kasur.position.y=tinggi+.13; kasur.castShadow=kasur.receiveShadow=true; g.add(kasur);
  menuObjek.bed=kasur;

  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const k=new T.Mesh(kotakBulat(.075,tinggi,.075,.014),matKayuGelap);
    k.position.set(sx*(P/2-.14),tinggi/2,sz*(L/2-.12));
    k.castShadow=true; g.add(k);
  });
  const palang=new T.Mesh(kotakBulat(P-.36,.05,.05,.014),matKayuGelap);
  palang.position.set(0,.22,0); palang.castShadow=true; g.add(palang);

  /* sandaran kepala + lubang wajah */
  const sandaran=new T.Mesh(kotakBulat(.34,.11,.42,.05),matKainKrem);
  sandaran.position.set(-P/2-.1,tinggi+.16,0); sandaran.rotation.z=.16;
  sandaran.castShadow=true; g.add(sandaran);
  const lubang=new T.Mesh(new T.TorusGeometry(.11,.035,10,22),matKainKrem);
  lubang.position.set(-P/2-.1,tinggi+.225,0); lubang.rotation.x=-Math.PI/2;
  lubang.rotation.z=.16; lubang.castShadow=true; g.add(lubang);

  /* handuk terlipat melintang + selimut tergulung di kaki */
  const handuk=new T.Mesh(kotakBulat(.62,.045,L+.04,.02),matHanduk);
  handuk.position.set(.28,tinggi+.235,0); handuk.castShadow=true; g.add(handuk);
  const lipat=new T.Mesh(kotakBulat(.6,.035,L-.06,.016),matHanduk);
  lipat.position.set(.3,tinggi+.268,.02); lipat.rotation.y=.03; lipat.castShadow=true; g.add(lipat);

  const gulung=new T.Mesh(silinder(.09,.09,L-.08,18),matHanduk);
  gulung.rotation.x=Math.PI/2; gulung.position.set(P/2-.2,tinggi+.28,0);
  gulung.castShadow=true; g.add(gulung);

  /* bantal kecil */
  const bantal=new T.Mesh(kotakBulat(.3,.09,.2,.045),matHanduk);
  bantal.position.set(-.62,tinggi+.27,-.04); bantal.rotation.y=-.12;
  bantal.castShadow=true; g.add(bantal);
}
buatBed();

/* trolly alat & bahan */
function buatTrolley(){
  const g=new T.Group(); g.position.set(1.72,0,-.45); g.rotation.y=-.34; scene.add(g);
  const W=.56, D=.42, tinggi=.86;
  const rakMat=new T.MeshStandardMaterial({color:0xf3f2ef,roughness:.34,metalness:.06});

  [0,.42,.84].forEach((y,i)=>{
    const r=new T.Mesh(kotakBulat(W,.028,D,.012),rakMat);
    r.position.y=y+.14; r.castShadow=r.receiveShadow=true; g.add(r);
    if(i===2) menuObjek.trolley=r;
  });
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const t=new T.Mesh(silinder(.016,.016,tinggi,12),matKrom);
    t.position.set(sx*(W/2-.03),tinggi/2+.12,sz*(D/2-.03));
    t.castShadow=true; g.add(t);
    const roda=new T.Mesh(new T.SphereGeometry(.032,12,10),
      new T.MeshStandardMaterial({color:0x2a2a2e,roughness:.5,metalness:.3}));
    roda.position.set(sx*(W/2-.03),.034,sz*(D/2-.03)); roda.castShadow=true; g.add(roda);
  });
  const pegangan=new T.Mesh(new T.TorusGeometry(.1,.014,10,20,Math.PI),matKrom);
  pegangan.position.set(0,tinggi+.14,-D/2+.02); pegangan.rotation.set(Math.PI/2,0,0);
  pegangan.castShadow=true; g.add(pegangan);

  /* botol minyak — profil diputar (lathe) supaya lehernya melengkung wajar */
  function botol(tinggiBotol,rBadan,warna,tembus){
    const titik=[];
    titik.push(new T.Vector2(0,0));
    titik.push(new T.Vector2(rBadan*.86,0));
    titik.push(new T.Vector2(rBadan,tinggiBotol*.1));
    titik.push(new T.Vector2(rBadan,tinggiBotol*.6));
    titik.push(new T.Vector2(rBadan*.82,tinggiBotol*.74));
    titik.push(new T.Vector2(rBadan*.34,tinggiBotol*.84));
    titik.push(new T.Vector2(rBadan*.3,tinggiBotol));
    const m=new T.Mesh(new T.LatheGeometry(titik,26),
      tembus
        ? new T.MeshPhysicalMaterial({color:warna,roughness:.08,metalness:0,
            transmission:.86,thickness:.5,ior:1.46,clearcoat:.9,clearcoatRoughness:.06})
        : new T.MeshStandardMaterial({color:warna,roughness:.3,metalness:.05}));
    m.castShadow=true;
    const tutup=new T.Mesh(silinder(rBadan*.34,rBadan*.34,tinggiBotol*.12,16),
      new T.MeshStandardMaterial({color:0x3b2a1c,roughness:.42,metalness:.15}));
    tutup.position.y=tinggiBotol+tinggiBotol*.05; m.add(tutup);
    return m;
  }
  const atas=.98;
  const b1=botol(.2,.045,0xc98338,true);  b1.position.set(-.16,atas,.05);  g.add(b1);
  const b2=botol(.16,.038,0x8fae6a,true); b2.position.set(-.03,atas,-.06); g.add(b2);
  const b3=botol(.23,.04,0xe3ded2,false); b3.position.set(.11,atas,.04);   g.add(b3);

  /* mangkuk kecil + handuk lipat di rak bawah */
  const mangkuk=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.06,.005),new T.Vector2(.085,.045),new T.Vector2(.088,.06)],20),
    new T.MeshStandardMaterial({color:0xd8cdbb,roughness:.45,metalness:.05}));
  mangkuk.position.set(.16,.56,-.06); mangkuk.castShadow=true; g.add(mangkuk);
  const tumpuk=new T.Mesh(kotakBulat(.34,.12,.24,.03),matHanduk);
  tumpuk.position.set(-.06,.2,0); tumpuk.castShadow=true; g.add(tumpuk);
}
buatTrolley();

/* meja rendah: baskom air, lilin aromaterapi, batu spa */
const lilinCahaya=[];
function buatMejaLilin(){
  const g=new T.Group(); g.position.set(2.25,0,.85); g.rotation.y=-.5; scene.add(g);

  const kaki=new T.Mesh(silinder(.16,.2,.42,20),matKayuGelap);
  kaki.position.y=.21; kaki.castShadow=kaki.receiveShadow=true; g.add(kaki);
  const daun=new T.Mesh(silinder(.44,.44,.055,32),matKayuGelap);
  daun.position.y=.45; daun.castShadow=daun.receiveShadow=true; g.add(daun);
  menuObjek.meja=daun;

  /* baskom + permukaan air beriak */
  const baskom=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.14,.008),new T.Vector2(.19,.075),new T.Vector2(.2,.1)],28),
    new T.MeshStandardMaterial({color:0xcfc4b2,roughness:.38,metalness:.06}));
  baskom.position.set(-.11,.48,.02); baskom.castShadow=baskom.receiveShadow=true; g.add(baskom);

  const air=new T.Mesh(new T.CircleGeometry(.175,40,1),
    new T.MeshPhysicalMaterial({color:0x6f9aa6,roughness:.06,metalness:.0,
      transmission:.72,thickness:.12,ior:1.33,clearcoat:1,clearcoatRoughness:.02}));
  air.rotation.x=-Math.PI/2; air.position.set(-.11,.565,.02); g.add(air);
  const asalAir=air.geometry.attributes.position.array.slice();
  perlu(w=>{                                    /* riak air */
    const p=air.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=asalAir[i*3], y=asalAir[i*3+1], r=Math.hypot(x,y);
      p.setZ(i, Math.sin(r*34-w*2.6)*.0035*(1-r/.19) + Math.sin(x*22+w*1.7)*.0016);
    }
    p.needsUpdate=true; air.geometry.computeVertexNormals();
  });

  /* kelopak bunga mengapung */
  const matKelopak=new T.MeshStandardMaterial({color:0xe2758f,roughness:.72,side:T.DoubleSide});
  for(let i=0;i<5;i++){
    const k=new T.Mesh(new T.CircleGeometry(.026,10,0,Math.PI*1.5),matKelopak);
    const a=acak(0,7), r=acak(.03,.12);
    k.position.set(-.11+Math.cos(a)*r,.571,.02+Math.sin(a)*r);
    k.rotation.set(-Math.PI/2,0,acak(0,7)); g.add(k);
    const dasar=k.position.clone(), fase=acak(0,7);
    perlu(w=>{
      k.position.y=dasar.y+Math.sin(w*1.5+fase)*.004;
      k.rotation.z+=.0016;
    });
  }

  /* tiga lilin: nyala + kilau + cahaya berkedip */
  const texGlow=tekstur(texKilau(),1,1);
  const matLilin=new T.MeshStandardMaterial({color:0xf7ecd6,roughness:.55,
    emissive:0xffb774,emissiveIntensity:.16});
  [[.16,.03,.55],[.26,-.09,.4],[.1,-.17,.48]].forEach(([lx,lz,tinggiLilin],i)=>{
    const badan=new T.Mesh(silinder(.036,.038,tinggiLilin*.22,18),matLilin);
    badan.position.set(lx,.48+tinggiLilin*.11,lz); badan.castShadow=true; g.add(badan);

    const api=new T.Mesh(new T.ConeGeometry(.014,.052,10),
      new T.MeshBasicMaterial({color:0xffcf7a,transparent:true,opacity:.95,
        blending:T.AdditiveBlending,depthWrite:false}));
    api.position.set(lx,.48+tinggiLilin*.22+.03,lz); g.add(api);

    const kilau=new T.Sprite(new T.SpriteMaterial({map:texGlow,color:0xffb765,
      transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false}));
    kilau.scale.set(.26,.26,1); kilau.position.copy(api.position); g.add(kilau);

    const cahaya=new T.PointLight(0xffa24d,1.35,1.9,2);
    cahaya.position.copy(api.position); g.add(cahaya);
    lilinCahaya.push(cahaya);

    const fase=i*2.1;
    perlu(w=>{                                  /* kedip nyala api */
      const n=Math.sin(w*11+fase)*.5+Math.sin(w*24.3+fase*2)*.32+Math.sin(w*4.1+fase)*.18;
      api.scale.set(1+n*.13,1+n*.3,1+n*.13);
      api.position.x=lx+n*.0035;
      kilau.scale.setScalar(.25+n*.05);
      cahaya.intensity=1.2+n*.45;
    });
  });

  /* batu spa bertumpuk */
  const matBatu=new T.MeshStandardMaterial({color:0x3b3b40,roughness:.35,metalness:.05});
  [[-.3,.475,-.16,.05],[-.31,.52,-.15,.042],[-.315,.556,-.152,.032]].forEach(([bx,by,bz,r])=>{
    const b=new T.Mesh(new T.SphereGeometry(r,16,12),matBatu);
    b.position.set(bx,by,bz); b.scale.y=.42; b.castShadow=true; g.add(b);
  });
}
buatMejaLilin();

/* bangku terapis + papan catatan (menu Pengantar) */
function buatBangku(){
  const g=new T.Group(); g.position.set(-2.2,0,1.25); g.rotation.y=.62; scene.add(g);
  const dudukan=new T.Mesh(silinder(.21,.2,.075,26),matKainKrem);
  dudukan.position.y=.52; dudukan.castShadow=dudukan.receiveShadow=true; g.add(dudukan);
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3;
    const k=new T.Mesh(silinder(.017,.024,.53,10),matKayuGelap);
    k.position.set(Math.cos(a)*.14,.265,Math.sin(a)*.14);
    k.rotation.set(Math.cos(a)*.13,0,-Math.sin(a)*.13);
    k.castShadow=true; g.add(k);
  }
  /* papan catatan bersandar di dudukan */
  const papan=new T.Mesh(kotakBulat(.3,.4,.016,.008),
    new T.MeshStandardMaterial({color:0x8a5a33,roughness:.55}));
  papan.position.set(0,.72,-.03); papan.rotation.set(-.28,0,0);
  papan.castShadow=true; g.add(papan);
  menuObjek.papan=papan;

  const kertasTex=tekstur(kanvas(256,340,(x,w,h)=>{
    x.fillStyle='#fbf7ef'; x.fillRect(0,0,w,h);
    x.fillStyle='#7a5fa0'; x.fillRect(0,0,w,26);
    x.fillStyle='#c9bcd8';
    for(let y=48;y<h-16;y+=22){ x.fillRect(18,y,w-36-(Math.random()<.3?60:0),4); }
    x.fillStyle='#e0d6ec'; x.fillRect(18,h-40,90,18);
  }),1,1);
  const kertas=new T.Mesh(new T.PlaneGeometry(.26,.35),
    new T.MeshStandardMaterial({map:kertasTex,roughness:.94}));
  kertas.position.set(0,.723,-.019); kertas.rotation.set(-.28,0,0); g.add(kertas);

  const penjepit=new T.Mesh(kotakBulat(.14,.035,.03,.008),matKrom);
  penjepit.position.set(0,.895,-.028); penjepit.rotation.set(-.28,0,0);
  penjepit.castShadow=true; g.add(penjepit);
}
buatBangku();

/* bingkai dinding: poster anatomi (kanan) & sertifikat (belakang) */
function texPosterAnatomi(){
  return kanvas(560,760,(x,w,h)=>{
    x.fillStyle='#fbf6ee'; x.fillRect(0,0,w,h);
    x.fillStyle='#6b4c8a'; x.fillRect(0,0,w,74);
    x.fillStyle='#fff'; x.font='bold 30px Georgia'; x.textAlign='center';
    x.fillText('ANATOMI OTOT',w/2,48);
    /* siluet tubuh tampak belakang */
    x.fillStyle='#e8b291'; x.strokeStyle='#b9765a'; x.lineWidth=3;
    const cx=w/2;
    x.beginPath(); x.ellipse(cx,150,44,52,0,0,7); x.fill(); x.stroke();          /* kepala */
    x.beginPath();
    x.moveTo(cx-96,222); x.quadraticCurveTo(cx,196,cx+96,222);
    x.lineTo(cx+82,430); x.quadraticCurveTo(cx,458,cx-82,430); x.closePath();
    x.fill(); x.stroke();                                                        /* punggung */
    [-1,1].forEach(s=>{
      x.beginPath(); x.moveTo(cx+s*88,232);
      x.quadraticCurveTo(cx+s*140,320,cx+s*126,420);
      x.lineTo(cx+s*98,414); x.quadraticCurveTo(cx+s*108,320,cx+s*70,246);
      x.closePath(); x.fill(); x.stroke();                                       /* lengan */
      x.beginPath(); x.moveTo(cx+s*14,440);
      x.quadraticCurveTo(cx+s*84,520,cx+s*60,700);
      x.lineTo(cx+s*14,700); x.quadraticCurveTo(cx+s*18,540,cx+s*6,444);
      x.closePath(); x.fill(); x.stroke();                                       /* tungkai */
    });
    x.strokeStyle='#a8543c'; x.lineWidth=1.6;
    for(let i=0;i<9;i++){ x.beginPath();
      x.moveTo(cx-70,250+i*20); x.quadraticCurveTo(cx,244+i*20,cx+70,250+i*20); x.stroke(); }
    const label=(t,px,py)=>{
      x.fillStyle='#c0392b'; x.beginPath(); x.arc(px,py,7,0,7); x.fill();
      x.fillStyle='#4a4052'; x.font='bold 19px Segoe UI'; x.textAlign=px<cx?'right':'left';
      x.fillText(t,px+(px<cx?-14:14),py+7);
    };
    label('Trapezius',cx-84,258); label('Latisimus',cx+84,330);
    label('Vertebrae',cx-84,392); label('Gluteus',cx+84,452);
    label('Hamstring',cx-84,556); label('Gastrocnemius',cx+84,646);
  });
}
function texSertifikat(){
  return kanvas(620,440,(x,w,h)=>{
    x.fillStyle='#fdfaf3'; x.fillRect(0,0,w,h);
    x.strokeStyle='#c9a227'; x.lineWidth=8;  x.strokeRect(20,20,w-40,h-40);
    x.strokeStyle='#e4cf87'; x.lineWidth=2;  x.strokeRect(34,34,w-68,h-68);
    x.textAlign='center'; x.fillStyle='#8a6b1f'; x.font='bold 17px Segoe UI';
    x.fillText('HASIL BELAJAR',w/2,96);
    x.fillStyle='#3a2e46'; x.font='italic 40px Georgia';
    x.fillText('Laboratorium Maya',w/2,168);
    x.font='22px Georgia'; x.fillStyle='#6b4c8a';
    x.fillText('Anatomi & Fisiologi Kecantikan dan Spa',w/2,206);
    x.strokeStyle='#c9a227'; x.lineWidth=2; x.beginPath();
    x.moveTo(w/2-120,236); x.lineTo(w/2+120,236); x.stroke();
    x.fillStyle='#8a7d94'; x.font='15px Segoe UI';
    x.fillText('Rekap capaian seluruh',w/2,268);
    x.fillText('ruang praktik',w/2,292);
    x.fillStyle='#c9a227'; x.font='34px Georgia'; x.fillText('★ ★ ★ ★ ★',w/2,348);
    x.fillStyle='#6b6072'; x.font='13px Segoe UI';
    x.fillText('SMK — Fase E · Dasar-Dasar Kecantikan dan SPA',w/2,394);
  });
}
function bingkaiDinding(texKanvas,lebar,tinggi,pos,rotY,nama){
  const g=new T.Group(); g.position.set(...pos); g.rotation.y=rotY; scene.add(g);
  const bing=new T.Mesh(kotakBulat(lebar+.09,tinggi+.09,.05,.012),
    new T.MeshStandardMaterial({color:0x5a3b22,roughness:.42,metalness:.08}));
  bing.castShadow=bing.receiveShadow=true; g.add(bing);
  const isi=new T.Mesh(new T.PlaneGeometry(lebar,tinggi),
    new T.MeshStandardMaterial({map:tekstur(texKanvas,1,1),roughness:.62,metalness:.02}));
  isi.position.z=.028; g.add(isi);
  const kaca=new T.Mesh(new T.PlaneGeometry(lebar,tinggi),
    new T.MeshPhysicalMaterial({color:0xffffff,roughness:.06,metalness:0,transparent:true,
      opacity:.1,transmission:.35,thickness:.01,clearcoat:1}));
  kaca.position.z=.032; g.add(kaca);
  menuObjek[nama]=bing;
  return g;
}
bingkaiDinding(texPosterAnatomi(),.72,.98,[RUANG.lebar/2-.05,1.72,-.95],-Math.PI/2,'poster');
bingkaiDinding(texSertifikat(),.96,.68,[-3.02,1.74,-RUANG.dalam/2+.06],0,'sertifikat');

/* rak dinding + handuk gulung */
function buatRak(){
  const g=new T.Group(); g.position.set(RUANG.lebar/2-.16,0,.9); g.rotation.y=-Math.PI/2; scene.add(g);
  [1.02,1.42].forEach(y=>{
    const p=new T.Mesh(kotakBulat(1.15,.045,.3,.012),matKayuGelap);
    p.position.set(0,y,0); p.castShadow=p.receiveShadow=true; g.add(p);
  });
  for(let i=0;i<5;i++){
    const h=new T.Mesh(silinder(.062,.062,.26,16),matHanduk);
    h.rotation.z=Math.PI/2;
    h.position.set(-.44+i*.2,1.11,0); h.castShadow=true; g.add(h);
  }
  for(let i=0;i<3;i++){
    const t=new T.Mesh(new T.LatheGeometry(
      [new T.Vector2(0,0),new T.Vector2(.05,0),new T.Vector2(.055,.09),
       new T.Vector2(.045,.13),new T.Vector2(.046,.145)],20),
      new T.MeshPhysicalMaterial({color:[0xd8b06a,0xb8c9a0,0xd0a8b8][i],roughness:.12,
        transmission:.7,thickness:.3,ior:1.45,clearcoat:.8}));
    t.position.set(-.34+i*.24,1.45,0); t.castShadow=true; g.add(t);
  }
}
buatRak();

/* tanaman hias di sudut */
function buatTanaman(){
  const g=new T.Group(); g.position.set(-2.95,0,-3.05); scene.add(g);
  const pot=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.17,0),new T.Vector2(.21,.06),
     new T.Vector2(.25,.34),new T.Vector2(.26,.38)],28),
    new T.MeshStandardMaterial({color:0x9c6a4a,roughness:.78,metalness:.02}));
  pot.position.y=.0; pot.castShadow=pot.receiveShadow=true; g.add(pot);
  const tanah=new T.Mesh(new T.CircleGeometry(.24,24),
    new T.MeshStandardMaterial({color:0x2e2119,roughness:1}));
  tanah.rotation.x=-Math.PI/2; tanah.position.y=.375; g.add(tanah);

  const daunBentuk=new T.Shape();
  daunBentuk.moveTo(0,0);
  daunBentuk.quadraticCurveTo(.14,.26,0,.72);
  daunBentuk.quadraticCurveTo(-.14,.26,0,0);
  const geoDaun=new T.ExtrudeGeometry(daunBentuk,
    {depth:.006,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,curveSegments:10});
  const matDaun=new T.MeshStandardMaterial({color:0x3f6b33,roughness:.66,metalness:.02,
    side:T.DoubleSide});
  for(let i=0;i<13;i++){
    const d=new T.Mesh(geoDaun,matDaun);
    const a=i*2.2, r=acak(.02,.1), s=acak(.85,1.5);
    d.position.set(Math.cos(a)*r,.36,Math.sin(a)*r);
    d.scale.setScalar(s);
    d.rotation.set(acak(-.5,-.15),a,acak(-.35,.35));
    d.castShadow=true; g.add(d);
    const rx=d.rotation.x, fase=acak(0,7);
    perlu(w=>{ d.rotation.x=rx+Math.sin(w*.6+fase)*.028; });
  }
}
buatTanaman();

/* lampu gantung di atas meja perawatan */
function buatLampuGantung(){
  const g=new T.Group(); g.position.set(-.35,0,-1.0); scene.add(g);
  const kabel=new T.Mesh(silinder(.006,.006,.5,8),
    new T.MeshStandardMaterial({color:0x2a2226,roughness:.8}));
  kabel.position.y=RUANG.tinggi-.25; g.add(kabel);
  const kap=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(.02,.3),new T.Vector2(.1,.22),new T.Vector2(.21,.02),new T.Vector2(.225,0)],26),
    new T.MeshStandardMaterial({color:0xd9c39a,roughness:.44,metalness:.35,side:T.DoubleSide}));
  kap.position.y=RUANG.tinggi-.62; kap.castShadow=true; g.add(kap);
  const bola=new T.Mesh(new T.SphereGeometry(.07,18,14),
    new T.MeshBasicMaterial({color:0xffdca6}));
  bola.position.y=RUANG.tinggi-.66; g.add(bola);
  const kilau=new T.Sprite(new T.SpriteMaterial({map:tekstur(texKilau(),1,1),
    color:0xffc98a,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false}));
  kilau.scale.set(.9,.9,1); kilau.position.copy(bola.position); g.add(kilau);
  perlu(w=>{                                    /* ayunan sangat halus */
    g.rotation.z=Math.sin(w*.42)*.008;
    g.rotation.x=Math.cos(w*.31)*.006;
    gantung.position.set(-.35+Math.sin(w*.42)*.02,2.42,-1.0);
  });
}
buatLampuGantung();

/* ---------- 4b. RUANG ORIENTASI (materi Pengantar Modul) ----------
   Ruang kedua, dibangun terpisah jauh di sumbu X supaya tidak saling
   menimpa dengan ruang praktik. Kamera berpindah ke sini ketika pengguna
   memilih menu 1 "Pengantar Modul". Isi teksnya ditampilkan sebagai
   lapisan HTML di atas kanvas agar tetap tajam dan bisa digulung;
   ruangan ini yang memberi suasananya. */
/* Menempatkan mentor sebagai bidang bertekstur yang selalu menghadap kamera.
   `ofs` adalah geseran X ruangan induknya — dibutuhkan supaya sudut hadapnya
   dihitung terhadap posisi kamera di dunia, bukan koordinat lokal ruangan.
   Bahan standar + emissiveMap membuatnya ikut menerima cahaya ruangan tanpa
   tenggelam dalam bayangan. */
function taruhMentor(induk, {x=0, z=0, ofs=0, tinggi=1.62, dasar=0, emisi=.4}={}){
  if(!window.MENTOR_PNG) return;
  new T.TextureLoader().load(window.MENTOR_PNG, peta=>{
    peta.colorSpace=T.SRGBColorSpace; peta.anisotropy=8;
    const lebar=tinggi*(peta.image.width/peta.image.height);
    const m=new T.Mesh(new T.PlaneGeometry(lebar,tinggi),
      new T.MeshStandardMaterial({map:peta,transparent:true,alphaTest:.35,
        roughness:.92,metalness:0,side:T.DoubleSide,
        emissive:0xffffff,emissiveMap:peta,emissiveIntensity:emisi}));
    m.position.set(x, dasar+tinggi/2, z);
    induk.add(m);
    /* bayangan kontak lembut supaya ia terasa berpijak */
    const by=new T.Mesh(new T.CircleGeometry(tinggi*.17,26),
      new T.MeshBasicMaterial({map:texTitik,color:0x1a0f0c,transparent:true,
        opacity:.32,depthWrite:false}));
    by.rotation.x=-Math.PI/2; by.position.set(x,.012,z+.08);
    by.scale.set(.95,1.3,1); induk.add(by);
    const y0=m.position.y;
    perlu(w=>{
      m.rotation.y=Math.atan2(camera.position.x-(ofs+x), camera.position.z-z);
      m.position.y=y0+Math.sin(w*1.12)*.008;          /* tarikan napas halus */
      m.scale.set(1+Math.sin(w*1.12)*.004,1+Math.sin(w*1.12+.5)*.005,1);
    });
  });
}

const OFS = 30;                                  /* jarak geser ruang orientasi */
const RUANGAN = {};                              /* grup tiap ruang tambahan */

function texPapanPengantar(){
  return kanvas(1400,800,(x,w,h)=>{
    const g=x.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#fdf8f1'); g.addColorStop(1,'#f2e6d8');
    x.fillStyle=g; x.fillRect(0,0,w,h);
    x.strokeStyle='#c9a227'; x.lineWidth=6; x.strokeRect(26,26,w-52,h-52);

    x.textAlign='center';
    x.fillStyle='#8a6b1f'; x.font='bold 26px "Segoe UI",sans-serif';
    x.fillText('SMK — FASE E · DASAR-DASAR KECANTIKAN DAN SPA', w/2, 108);
    x.fillStyle='#4a2f5e'; x.font='bold 74px Georgia';
    x.fillText('PENGANTAR MODUL', w/2, 196);
    x.fillStyle='#7b5a97'; x.font='italic 34px Georgia';
    x.fillText('Anatomi & Fisiologi untuk Kecantikan dan Spa', w/2, 248);
    x.strokeStyle='#d8b25e'; x.lineWidth=3;
    x.beginPath(); x.moveTo(w/2-260,282); x.lineTo(w/2+260,282); x.stroke();

    /* identitas modul */
    const baris=[['Mata pelajaran','Dasar-Dasar Kecantikan dan SPA'],
                 ['Fase / Kelas','E — X / Semester 2'],
                 ['Elemen','Pengetahuan anatomi dan fisiologi untuk perawatan kecantikan'],
                 ['Alokasi','Satu sesi laboratorium maya (± 45 menit)']];
    x.textAlign='left';
    baris.forEach(([k,v],i)=>{
      const y=352+i*58;
      x.fillStyle='#9b8fa8'; x.font='bold 24px "Segoe UI",sans-serif';
      x.fillText(k.toUpperCase(), 120, y);
      x.fillStyle='#3a2e46'; x.font='27px "Segoe UI",sans-serif';
      x.fillText(v, 430, y);
    });

    /* kutipan */
    x.fillStyle='rgba(216,178,94,.16)';
    x.fillRect(96, 600, w-192, 128);
    x.strokeStyle='#d8b25e'; x.lineWidth=5;
    x.beginPath(); x.moveTo(96,600); x.lineTo(96,728); x.stroke();
    x.fillStyle='#6b4c8a'; x.font='italic 27px Georgia'; x.textAlign='center';
    x.fillText('“Memahami anatomi dan fisiologi adalah pondasi utama untuk', w/2, 654);
    x.fillText('memberikan perawatan kecantikan yang aman, tepat, dan profesional.”', w/2, 694);
  });
}

function buatRuangPengantar(){
  const R={l:6.6,t:3.0,d:6.4};
  const g=new T.Group(); g.position.set(OFS,0,0); scene.add(g);

  const lantai=new T.Mesh(new T.PlaneGeometry(R.l,R.d),matLantai);
  lantai.rotation.x=-Math.PI/2; lantai.receiveShadow=true; g.add(lantai);
  const sisi=(w,h,mat,pos,rot)=>{
    const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.receiveShadow=true; g.add(m); return m;
  };
  sisi(R.l,R.t,matDindingBelakang,[0,R.t/2,-R.d/2]);
  sisi(R.d,R.t,matDinding,[-R.l/2,R.t/2,0],[0,Math.PI/2,0]);
  sisi(R.d,R.t,matDinding,[ R.l/2,R.t/2,0],[0,-Math.PI/2,0]);
  sisi(R.l,R.t,matDinding,[0,R.t/2, R.d/2],[0,Math.PI,0]);
  sisi(R.l,R.d,matLangit,[0,R.t,0],[Math.PI/2,0,0]);
  [[R.l,[0,.065,-R.d/2+.03],null],
   [R.d,[-R.l/2+.03,.065,0],[0,Math.PI/2,0]],
   [R.d,[ R.l/2-.03,.065,0],[0,-Math.PI/2,0]]].forEach(([w,pos,rot])=>{
    const m=new T.Mesh(kotakBulat(w,.13,.05,.015),matKayuGelap);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.castShadow=m.receiveShadow=true; g.add(m);
  });

  /* televisi layar datar menempel di dinding belakang — menggantikan papan
     berpigura yang dulu disorot dua lampu; layar memancarkan cahayanya sendiri
     sehingga warnanya tidak lagi tercuci sorotan. */
  const papanG=new T.Group(); papanG.position.set(-.95,1.72,-R.d/2+.08); g.add(papanG);
  const bing=new T.Mesh(kotakBulat(3.5,2.0,.055,.018),matBezel);
  bing.castShadow=bing.receiveShadow=true; papanG.add(bing);
  const dudukan=new T.Mesh(kotakBulat(.62,.5,.05,.012),
    new T.MeshStandardMaterial({color:0x151317,roughness:.6,metalness:.3}));
  dudukan.position.z=-.05; papanG.add(dudukan);
  const petaPapan=tekstur(texPapanPengantar(),1,1);
  const isi=new T.Mesh(new T.PlaneGeometry(3.34,1.86),
    new T.MeshStandardMaterial({map:petaPapan,roughness:.22,metalness:.05,
      emissive:0xffffff,emissiveMap:petaPapan,emissiveIntensity:.5}));
  isi.position.z=.038; papanG.add(isi);
  const ledPg=new T.Mesh(new T.SphereGeometry(.012,10,8),
    new T.MeshBasicMaterial({color:0x6fe3a8}));
  ledPg.position.set(1.60,-.965,.035); papanG.add(ledPg);

  /* meja konsultasi + kursi */
  const mejaG=new T.Group(); mejaG.position.set(1.55,0,.75); mejaG.rotation.y=-.5; g.add(mejaG);
  const daun=new T.Mesh(kotakBulat(1.5,.06,.72,.02),matKayuGelap);
  daun.position.y=.74; daun.castShadow=daun.receiveShadow=true; mejaG.add(daun);
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const k=new T.Mesh(kotakBulat(.06,.72,.06,.012),matKayuGelap);
    k.position.set(sx*.66,.36,sz*.29); k.castShadow=true; mejaG.add(k);
  });
  /* tumpukan buku */
  [[0x8a5a33,.03,0],[0x6b4c8a,.028,.03],[0xc9a227,.024,.058]].forEach(([c,t,y],i)=>{
    const bk=new T.Mesh(kotakBulat(.26-i*.012,t,.19-i*.008,.006),
      new T.MeshStandardMaterial({color:c,roughness:.62}));
    bk.position.set(-.44,.775+y,.03); bk.rotation.y=acak(-.09,.09);
    bk.castShadow=true; mejaG.add(bk);
  });
  /* lampu meja */
  const lmp=new T.Group(); lmp.position.set(.48,.77,-.08); mejaG.add(lmp);
  const alas=new T.Mesh(silinder(.09,.1,.02,18),matKrom); alas.castShadow=true; lmp.add(alas);
  const tiang=new T.Mesh(silinder(.012,.012,.3,10),matKrom); tiang.position.y=.16; lmp.add(tiang);
  const kapM=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(.03,.16),new T.Vector2(.11,.02),new T.Vector2(.12,0)],18),
    new T.MeshStandardMaterial({color:0xe8d3a8,roughness:.5,metalness:.2,side:T.DoubleSide}));
  kapM.position.y=.3; kapM.castShadow=true; lmp.add(kapM);
  const nyala=new T.PointLight(0xffca87,3.2,2.2,2); nyala.position.set(0,.26,0); lmp.add(nyala);
  const kilauM=new T.Sprite(new T.SpriteMaterial({map:tekstur(texKilau(),1,1),color:0xffc98a,
    transparent:true,opacity:.4,blending:T.AdditiveBlending,depthWrite:false}));
  kilauM.scale.set(.5,.5,1); kilauM.position.set(0,.26,0); lmp.add(kilauM);
  /* cangkir teh */
  const cangkir=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.04,.004),new T.Vector2(.045,.06),new T.Vector2(.047,.07)],18),
    new T.MeshStandardMaterial({color:0xf2ece2,roughness:.32}));
  cangkir.position.set(.06,.77,.17); cangkir.castShadow=true; mejaG.add(cangkir);

  /* kursi */
  const kursi=(px,pz,ry)=>{
    const kg=new T.Group(); kg.position.set(px,0,pz); kg.rotation.y=ry; mejaG.add(kg);
    const dud=new T.Mesh(kotakBulat(.42,.07,.4,.03),matKainKrem);
    dud.position.y=.45; dud.castShadow=dud.receiveShadow=true; kg.add(dud);
    const snd=new T.Mesh(kotakBulat(.42,.5,.06,.03),matKainKrem);
    snd.position.set(0,.72,-.18); snd.rotation.x=-.1; snd.castShadow=true; kg.add(snd);
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
      const k=new T.Mesh(silinder(.017,.022,.45,10),matKayuGelap);
      k.position.set(sx*.17,.225,sz*.16); k.castShadow=true; kg.add(k);
    });
  };
  kursi(0,.72,Math.PI); kursi(0,-.78,0);

  /* permadani */
  const permadani=new T.Mesh(new T.CircleGeometry(1.35,40),
    new T.MeshStandardMaterial({map:tekstur(texKain('#c9b39a'),3,3),roughness:1}));
  permadani.rotation.x=-Math.PI/2; permadani.position.set(1.3,.008,.7);
  permadani.receiveShadow=true; g.add(permadani);

  /* rak buku kecil di dinding kanan */
  const rak=new T.Group(); rak.position.set(R.l/2-.18,0,-1.1); rak.rotation.y=-Math.PI/2; g.add(rak);
  [1.0,1.45].forEach(y=>{
    const p=new T.Mesh(kotakBulat(1.1,.045,.28,.012),matKayuGelap);
    p.position.set(0,y,0); p.castShadow=p.receiveShadow=true; rak.add(p);
  });
  for(let i=0;i<9;i++){
    const t=acak(.2,.3), c=[0x8a5a33,0x6b4c8a,0xc9a227,0x9c6a4a,0x5a7a52][i%5];
    const bk=new T.Mesh(kotakBulat(.05,t,.2,.006),
      new T.MeshStandardMaterial({color:c,roughness:.66}));
    bk.position.set(-.44+i*.1,1.03+t/2,0); bk.rotation.z=acak(-.05,.05);
    bk.castShadow=true; rak.add(bk);
  }
  const potRak=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.07,0),new T.Vector2(.08,.11),new T.Vector2(.085,.13)],18),
    new T.MeshStandardMaterial({color:0xb08a62,roughness:.8}));
  potRak.position.set(.4,1.47,0); potRak.castShadow=true; rak.add(potRak);
  for(let i=0;i<7;i++){
    const d=new T.Mesh(new T.SphereGeometry(.035,10,8),
      new T.MeshStandardMaterial({color:0x4f7a3f,roughness:.7}));
    const a=i*.9;
    d.position.set(.4+Math.cos(a)*.05,1.62+Math.sin(i)*.03,Math.sin(a)*.05);
    d.scale.set(1,.7,1.5); d.castShadow=true; rak.add(d);
  }

  /* jendela di dinding kiri */
  const jg=new T.Group(); jg.position.set(-R.l/2+.03,1.62,.5); jg.rotation.y=Math.PI/2; g.add(jg);
  const kacaP=new T.Mesh(new T.PlaneGeometry(1.9,1.5),
    new T.MeshBasicMaterial({map:tekstur(texLuar(),1,1)}));
  kacaP.material.color.setScalar(1.4); kacaP.position.z=-.02; jg.add(kacaP);
  const bm=new T.MeshStandardMaterial({color:0xf2ece2,roughness:.6});
  [[2.1,.11,0,.8],[2.1,.11,0,-.8],[.11,1.7,-1.0,0],[.11,1.7,1.0,0],[.055,1.5,0,0],[1.9,.055,0,0]]
    .forEach(([w,h,px,py])=>{
      const m=new T.Mesh(kotakBulat(w,h,.08,.012),bm);
      m.position.set(px,py,.04); m.castShadow=true; jg.add(m);
    });
  const isianJ=new T.PointLight(0xcfe0ff,5.5,8,2);
  isianJ.position.set(-2.1,1.6,.5); g.add(isianJ);
  const hangat=new T.PointLight(0xffd2a0,7,10,1.7);
  hangat.position.set(.2,2.6,.2); g.add(hangat);
  /* pantulan lembut dari arah kamera supaya dinding depan tidak mati gelap */
  const depan=new T.PointLight(0xffdcb8,4,9,1.9);
  depan.position.set(.6,2.0,2.6); g.add(depan);
  const langitR=new T.HemisphereLight(0xffe6cc,0x3a2620,.75);
  langitR.position.set(0,3,0); g.add(langitR);
  /* sapuan pada dinding & langit-langit bagian atas */
  const atas=new T.PointLight(0xffd9b4,3.4,9,1.5);
  atas.position.set(-.4,2.85,1.4); g.add(atas);

  RUANGAN.pengantar=g;
  taruhMentor(g,{x:-2.62,z:-2.05,ofs:OFS,emisi:.38});
}
buatRuangPengantar();

/* ---------- 4c. RUANG MATERI (galeri anatomi) ----------
   Ruang ketiga: tiga papan topik pada dinding belakang — Kulit, Rambut, dan
   Tubuh/Otot sesuai STORYBOARD ANFIS REVISI 1 (materi "Wajah" sudah diganti
   menjadi "Tubuh/Sistem Otot"). Memilih topik menyalakan lampu papannya dan
   menggeser kamera ke arah papan tersebut. */
const OFS2 = 60;
const papanMateri = [];                 /* {sinar, bing} per topik */

/* Isi layar TV — dua kolom: ilustrasi topik di kiri, judul dan poin ringkas
   di kanan. Ilustrasinya persegi sedangkan layar 16:9, jadi tanpa kolom teks
   separuh layar akan kosong. Layar bersifat emisif sehingga ruangan ini tidak
   lagi memakai lampu sorot — sorotan justru mencuci gambar dan memudarkannya. */
function bungkusTeks(x, teks, maks){
  const kata=teks.split(' '); const baris=[]; let b='';
  kata.forEach(k=>{
    const uji = b ? b+' '+k : k;
    if(x.measureText(uji).width>maks && b){ baris.push(b); b=k; } else b=uji;
  });
  if(b) baris.push(b);
  return baris;
}
function layarTV(judul, sub, warna, poin, img){
  return kanvas(1024,576,(x,w,h)=>{
    const g=x.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#241b28'); g.addColorStop(1,'#120d15');
    x.fillStyle=g; x.fillRect(0,0,w,h);
    const r=x.createRadialGradient(250,h*.48,20,250,h*.48,340);
    r.addColorStop(0,'rgba(255,226,192,.2)'); r.addColorStop(1,'rgba(255,226,192,0)');
    x.fillStyle=r; x.fillRect(0,0,w,h);

    if(img){                                   /* ilustrasi kolom kiri */
      const pw=430, ph=460, sk=Math.min(pw/img.width, ph/img.height);
      const iw=img.width*sk, ih=img.height*sk;
      x.drawImage(img, 250-iw/2, h*.5-ih/2, iw, ih);
    }

    x.textAlign='left';                        /* kolom teks kanan */
    x.fillStyle=warna; x.font='bold 48px Georgia';
    x.fillText(judul,506,150);
    x.fillStyle='rgba(255,255,255,.5)'; x.font='italic 25px Georgia';
    x.fillText(sub,506,190);
    x.strokeStyle=warna; x.lineWidth=3; x.globalAlpha=.7;
    x.beginPath(); x.moveTo(506,218); x.lineTo(720,218); x.stroke(); x.globalAlpha=1;
    x.font='25px "Segoe UI",sans-serif';
    let y=272;
    poin.forEach(t=>{
      x.fillStyle=warna; x.beginPath(); x.arc(516,y-8,5,0,7); x.fill();
      x.fillStyle='rgba(255,255,255,.85)';
      bungkusTeks(x,t,452).forEach((br,k)=>{ x.fillText(br,538,y+k*34); });
      y += 34*bungkusTeks(x,t,452).length + 22;
    });
  });
}
function buatRuangMateri(){
  const R={l:8.6,t:3.1,d:6.6};
  const g=new T.Group(); g.position.set(OFS2,0,0); scene.add(g);

  const lantai=new T.Mesh(new T.PlaneGeometry(R.l,R.d),matLantai);
  lantai.rotation.x=-Math.PI/2; lantai.receiveShadow=true; g.add(lantai);
  const sisi=(w,h,mat,pos,rot)=>{
    const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.receiveShadow=true; g.add(m); return m;
  };
  sisi(R.l,R.t,matDindingBelakang,[0,R.t/2,-R.d/2]);
  sisi(R.d,R.t,matDinding,[-R.l/2,R.t/2,0],[0,Math.PI/2,0]);
  sisi(R.d,R.t,matDinding,[ R.l/2,R.t/2,0],[0,-Math.PI/2,0]);
  sisi(R.l,R.t,matDinding,[0,R.t/2, R.d/2],[0,Math.PI,0]);
  sisi(R.l,R.d,matLangit,[0,R.t,0],[Math.PI/2,0,0]);
  [[R.l,[0,.065,-R.d/2+.03],null],
   [R.d,[-R.l/2+.03,.065,0],[0,Math.PI/2,0]],
   [R.d,[ R.l/2-.03,.065,0],[0,-Math.PI/2,0]]].forEach(([w,pos,rot])=>{
    const m=new T.Mesh(kotakBulat(w,.13,.05,.015),matKayuGelap);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.castShadow=m.receiveShadow=true; g.add(m);
  });

  const TOPIK=[
    {x:-2.55, id:'kulit', judul:'KULIT', sub:'Sistem Integumen', warna:'#e0916a',
     poin:['Organ terbesar tubuh manusia','Tiga lapisan: epidermis, dermis, hipodermis',
           'Sembilan fungsi utama bagi tubuh']},
    {x:  0, id:'rambut', judul:'RAMBUT', sub:'Pelengkap Kulit', warna:'#b98fd8',
     poin:['Tersusun dari protein keratin','Tumbuh dari folikel di lapisan dermis',
           'Dasar layanan hair spa dan creambath']},
    {x: 2.55, id:'tubuh_dan_otot', judul:'TUBUH', sub:'Sistem Otot', warna:'#e0836a',
     poin:['Tiga jenis: rangka, jantung, polos','Enam fungsi utama otot tubuh',
           'Sasaran utama pemijatan badan']}
  ];
  TOPIK.forEach(t=>{
    const pg=new T.Group(); pg.position.set(t.x,1.72,-R.d/2+.07); g.add(pg);

    /* televisi layar datar: bingkai tipis, dudukan dinding, lampu daya kecil */
    const bezel=new T.Mesh(kotakBulat(2.16,1.3,.055,.018),matBezel);
    bezel.castShadow=bezel.receiveShadow=true; pg.add(bezel);
    const dudukan=new T.Mesh(kotakBulat(.5,.4,.05,.012),
      new T.MeshStandardMaterial({color:0x151317,roughness:.6,metalness:.3}));
    dudukan.position.z=-.05; pg.add(dudukan);

    const peta=tekstur(layarTV(t.judul,t.sub,t.warna,t.poin,null),1,1);
    const layar=new T.Mesh(new T.PlaneGeometry(2.04,1.148),
      new T.MeshStandardMaterial({map:peta,roughness:.22,metalness:.05,
        emissive:0xffffff,emissiveMap:peta,emissiveIntensity:.5}));
    layar.position.z=.038; pg.add(layar);

    /* ilustrasi versi asli dipasang begitu selesai dimuat */
    if(window.TOPIK_GBR && window.TOPIK_GBR[t.id]){
      const img=new Image();
      img.onload=()=>gantiTekstur(layar, layarTV(t.judul,t.sub,t.warna,t.poin,img));
      img.src=window.TOPIK_GBR[t.id];
    }

    const led=new T.Mesh(new T.SphereGeometry(.012,10,8),
      new T.MeshBasicMaterial({color:0x6fe3a8}));
    led.position.set(.93,-.605,.035); pg.add(led);
    const unit={layar,led,t,gbrTopik:null};
    unit.pulih=()=>gantiTekstur(layar, layarTV(t.judul,t.sub,t.warna,t.poin,unit.gbrTopik));
    papanMateri.push(unit);
  });

  /* bangku pengunjung di tengah */
  const bangku=new T.Group(); bangku.position.set(0,0,1.5); g.add(bangku);
  const dud=new T.Mesh(kotakBulat(2.0,.11,.5,.04),matKainKrem);
  dud.position.y=.45; dud.castShadow=dud.receiveShadow=true; bangku.add(dud);
  [-.82,.82].forEach(sx=>{
    const kaki=new T.Mesh(kotakBulat(.1,.44,.42,.02),matKayuGelap);
    kaki.position.set(sx,.22,0); kaki.castShadow=true; bangku.add(kaki);
  });

  /* pelari karpet di depan papan */
  const karpet=new T.Mesh(new T.PlaneGeometry(6.4,1.5),
    new T.MeshStandardMaterial({map:tekstur(texKain('#8a6f57'),8,3),roughness:1,color:0xb59a80}));
  karpet.rotation.x=-Math.PI/2; karpet.position.set(0,.008,-1.2);
  karpet.receiveShadow=true; g.add(karpet);

  /* tanaman sudut */
  [-3.7,3.7].forEach(px=>{
    const pot=new T.Mesh(new T.LatheGeometry(
      [new T.Vector2(0,0),new T.Vector2(.16,0),new T.Vector2(.2,.06),
       new T.Vector2(.23,.32),new T.Vector2(.24,.36)],24),
      new T.MeshStandardMaterial({color:0x9c6a4a,roughness:.78}));
    pot.position.set(px,0,-2.4); pot.castShadow=pot.receiveShadow=true; g.add(pot);
    for(let i=0;i<9;i++){
      const d=new T.Mesh(new T.SphereGeometry(.11,10,8),
        new T.MeshStandardMaterial({color:0x44703a,roughness:.7}));
      const a=i*1.4;
      d.position.set(px+Math.cos(a)*acak(.05,.18),.42+i*.045,-2.4+Math.sin(a)*acak(.05,.18));
      d.scale.set(1,.55,1.6); d.rotation.y=a; d.castShadow=true; g.add(d);
    }
  });

  /* jendela dinding kiri + cahaya */
  const jg=new T.Group(); jg.position.set(-R.l/2+.03,1.66,1.1); jg.rotation.y=Math.PI/2; g.add(jg);
  const kacaP=new T.Mesh(new T.PlaneGeometry(1.8,1.4),
    new T.MeshBasicMaterial({map:tekstur(texLuar(),1,1)}));
  kacaP.material.color.setScalar(1.4); kacaP.position.z=-.02; jg.add(kacaP);
  const bm=new T.MeshStandardMaterial({color:0xf2ece2,roughness:.6});
  [[2.0,.1,0,.75],[2.0,.1,0,-.75],[.1,1.6,-.95,0],[.1,1.6,.95,0],[.05,1.4,0,0]]
    .forEach(([w,h,px,py])=>{
      const m=new T.Mesh(kotakBulat(w,h,.08,.012),bm);
      m.position.set(px,py,.04); m.castShadow=true; jg.add(m);
    });

  const isianJ=new T.PointLight(0xcfe0ff,5,9,2); isianJ.position.set(-2.6,1.7,1.1); g.add(isianJ);
  const hangat=new T.PointLight(0xffd2a0,7.5,12,1.7); hangat.position.set(0,2.6,.4); g.add(hangat);
  const depan=new T.PointLight(0xffdcb8,4.2,10,1.9); depan.position.set(.4,2.0,3.0); g.add(depan);
  const langitR=new T.HemisphereLight(0xffe6cc,0x3a2620,.8); g.add(langitR);
  taruhMentor(g,{x:-2.75,z:.35,ofs:OFS2,emisi:.36});
  RUANGAN.materi=g;
}
buatRuangMateri();
/* Ruangan yang tidak sedang dikunjungi dimatikan seluruhnya. Bukan sekadar
   soal geometri: lampu di dalam grup yang tersembunyi ikut lepas dari daftar
   cahaya, sehingga shader tidak lagi menghitungnya tiap piksel dan peta
   bayangannya tidak dirender. Tanpa ini laju bingkai turun dari 60 ke ~45. */
function setRuangTampak(nama){
  Object.keys(RUANGAN).forEach(k=>{ RUANGAN[k].visible = (k===nama); });
}

/* ---------- 4d. RUANG PERSIAPAN (menu 3) ----------
   Ruangan pertama yang bersifat latihan, bukan bacaan. Tiga stasiun berjajar:
     kiri   — wastafel & cermin  → urutan persiapan diri terapis
     tengah — trolly & rak alat  → memilih alat dan bahan perawatan
     kanan  — meja penerimaan    → anamnesis dan keputusan kelayakan klien
   Kamera berpaling ke stasiun yang sedang dikerjakan. Alat yang benar dipilih
   muncul sungguhan di atas trolly (lihat taruhDiTrolly). */
const OFS3 = 90;

/* Isi cermin wastafel. Sebelumnya cermin dibuat sebagai bahan metalik mengilap
   (metalness .92, roughness .05) yang memantulkan peta lingkungan — pantulannya
   ikut berayun setiap kamera bergeser sehingga terlihat berkelip. Diganti
   tekstur diam: pantulan wajah mentor, dibalik mendatar sebagaimana cermin
   sungguhan, di atas kaca berwarna dingin. */
/* Cari kotak kepala pada gambar mentor dengan membaca kanal alpha bagian
   atasnya. Sosoknya tidak berada tepat di tengah kanvas (satu tangannya
   terentang), jadi memotong dengan angka tetap membuat wajah melenceng. */
function bidikKepala(img){
  const w=img.width;
  /* Deteksi dibatasi 18% teratas — hanya kepala. Pada 27% bahu dan lengan
     terentang sudah ikut masuk, dan kotaknya melebar ke seluruh gambar
     sehingga wajah jadi melenceng ke tepi cermin. */
  const hd=Math.round(img.height*.18);
  const c=document.createElement('canvas'); c.width=w; c.height=hd;
  const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(img,0,0,w,hd,0,0,w,hd);
  const d=x.getImageData(0,0,w,hd).data;
  let x0=w, x1=0;
  for(let py=0;py<hd;py+=2) for(let px=0;px<w;px+=2){
    if(d[(py*w+px)*4+3]>40){ if(px<x0)x0=px; if(px>x1)x1=px; }
  }
  const sh=Math.round(img.height*.26);
  if(x1<=x0) return {sx:0,sw:w,sy:0,sh};
  /* jendela dilebarkan dari lebar kepala, tetap berpusat pada kepala */
  const pusat=(x0+x1)/2, lebar=Math.round((x1-x0)*1.45);
  const sx=Math.max(0,Math.round(pusat-lebar/2));
  return {sx, sw:Math.min(w-sx,lebar), sy:0, sh};
}
function isiCermin(img){
  return kanvas(560,720,(x,w,h)=>{
    const g=x.createLinearGradient(0,0,w*.4,h);
    g.addColorStop(0,'#cfdce2'); g.addColorStop(.5,'#bccdd6'); g.addColorStop(1,'#a9bcc8');
    x.fillStyle=g; x.fillRect(0,0,w,h);
    if(img){
      const b=bidikKepala(img);
      const sk=Math.min(w*.92/b.sw, h*.82/b.sh);
      const dw=b.sw*sk, dh=b.sh*sk;
      x.save();
      x.globalAlpha=.9;
      x.translate(w,0); x.scale(-1,1);                 /* cermin membalik */
      x.drawImage(img, b.sx,b.sy,b.sw,b.sh, (w-dw)/2, h*.5-dh/2, dw, dh);
      x.restore();
    }
    /* semburat kaca dingin + kilau diagonal diam */
    x.fillStyle='rgba(150,185,205,.22)'; x.fillRect(0,0,w,h);
    const k=x.createLinearGradient(0,h*.1,w,h*.55);
    k.addColorStop(0,'rgba(255,255,255,0)'); k.addColorStop(.42,'rgba(255,255,255,.2)');
    k.addColorStop(.58,'rgba(255,255,255,.05)'); k.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=k; x.fillRect(0,0,w,h);
    const v=x.createRadialGradient(w/2,h/2,h*.28,w/2,h/2,h*.72);
    v.addColorStop(0,'rgba(40,60,72,0)'); v.addColorStop(1,'rgba(40,60,72,.38)');
    x.fillStyle=v; x.fillRect(0,0,w,h);
  });
}
const trollyRak = [];
const rakAlat = {};        /* id alat → benda di rak dinding */
let grupRakAlat = null;    /* grup stasiun alat, diisi saat ruangan dibangun */

/* Alat tanpa ilustrasi digambarkan sebagai kartu beremoji, bukan kotak polos,
   supaya seluruh isi rak dan trolly terbaca sebagai benda. */
function kartuAlat(ik){
  return kanvas(256,256,(x,w,h)=>{
    x.fillStyle='#f6f1e8';
    x.beginPath(); x.roundRect(20,34,w-40,h-68,28); x.fill();
    x.strokeStyle='#d6c8b6'; x.lineWidth=5; x.stroke();
    x.textAlign='center'; x.textBaseline='middle';
    x.font='108px "Apple Color Emoji","Segoe UI Emoji",system-ui';
    x.fillText(ik, w/2, h/2);
  });
}                    /* tiga papan rak trolly, untuk menaruh alat */
let trollyIsi = 0;

function buatRuangPersiapan(){
  const R={l:9.4,t:3.1,d:6.6};
  const g=new T.Group(); g.position.set(OFS3,0,0); scene.add(g);

  const lantai=new T.Mesh(new T.PlaneGeometry(R.l,R.d),matLantai);
  lantai.rotation.x=-Math.PI/2; lantai.receiveShadow=true; g.add(lantai);
  const sisi=(w,h,mat,pos,rot)=>{
    const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.receiveShadow=true; g.add(m); return m;
  };
  sisi(R.l,R.t,matDindingBelakang,[0,R.t/2,-R.d/2]);
  sisi(R.d,R.t,matDinding,[-R.l/2,R.t/2,0],[0,Math.PI/2,0]);
  sisi(R.d,R.t,matDinding,[ R.l/2,R.t/2,0],[0,-Math.PI/2,0]);
  sisi(R.l,R.t,matDinding,[0,R.t/2, R.d/2],[0,Math.PI,0]);
  sisi(R.l,R.d,matLangit,[0,R.t,0],[Math.PI/2,0,0]);
  [[R.l,[0,.065,-R.d/2+.03],null],
   [R.d,[-R.l/2+.03,.065,0],[0,Math.PI/2,0]],
   [R.d,[ R.l/2-.03,.065,0],[0,-Math.PI/2,0]]].forEach(([w,pos,rot])=>{
    const m=new T.Mesh(kotakBulat(w,.13,.05,.015),matKayuGelap);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.castShadow=m.receiveShadow=true; g.add(m);
  });

  const matUbin=new T.MeshStandardMaterial({
    map:tekstur(texKain('#dfe6e4'),9,4), roughness:.28, metalness:.05, color:0xf2f6f5});

  /* ===== stasiun kiri: wastafel, cermin, rak handuk ===== */
  const A=new T.Group(); A.position.set(-3.1,0,-R.d/2+.06); g.add(A);
  const ubin=new T.Mesh(new T.PlaneGeometry(2.6,2.2),matUbin);
  ubin.position.set(0,1.35,.015); A.add(ubin);

  const meja=new T.Mesh(kotakBulat(1.7,.09,.55,.02),
    new T.MeshStandardMaterial({color:0xe8e2d8,roughness:.24,metalness:.06}));
  meja.position.set(0,.86,.3); meja.castShadow=meja.receiveShadow=true; A.add(meja);
  [-1,1].forEach(sx=>{
    const k=new T.Mesh(kotakBulat(.09,.84,.09,.02),matKrom);
    k.position.set(sx*.72,.42,.3); k.castShadow=true; A.add(k);
  });
  const bak=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.19,.005),new T.Vector2(.23,.09),new T.Vector2(.235,.12)],26),
    new T.MeshStandardMaterial({color:0xf6f8f8,roughness:.16,metalness:.08}));
  bak.position.set(-.25,.9,.3); bak.castShadow=bak.receiveShadow=true; A.add(bak);
  const keran=new T.Mesh(new T.TorusGeometry(.1,.017,10,20,Math.PI*.9),matKrom);
  keran.position.set(-.25,1.02,.12); keran.rotation.set(0,0,-.15); keran.castShadow=true; A.add(keran);
  const bat=new T.Mesh(silinder(.02,.02,.14,10),matKrom);
  bat.position.set(-.25,.98,.12); A.add(bat);
  /* botol sabun & tisu */
  const sabun=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.045,0),new T.Vector2(.05,.14),
     new T.Vector2(.022,.17),new T.Vector2(.024,.21)],18),
    new T.MeshPhysicalMaterial({color:0xbfe0d8,roughness:.12,transmission:.6,thickness:.3,ior:1.45}));
  sabun.position.set(.12,.9,.28); sabun.castShadow=true; A.add(sabun);
  const tisu=new T.Mesh(kotakBulat(.24,.13,.16,.02),matHanduk);
  tisu.position.set(.5,.95,.28); tisu.castShadow=true; A.add(tisu);
  /* cermin */
  const bingC=new T.Mesh(kotakBulat(1.0,1.25,.07,.02),matKayuGelap);
  bingC.position.set(-.25,1.85,.04); bingC.castShadow=true; A.add(bingC);
  const petaCermin=tekstur(isiCermin(null),1,1);
  /* z 0,088 — bukan 0,075. Muka depan bingkai ada tepat di 0,075, sehingga
     bidang cermin dulu sebidang dengannya dan saling berebut kedalaman;
     itulah kelip-kelip yang terlihat, bukan pantulan bahannya. */
  const cermin=new T.Mesh(new T.PlaneGeometry(.88,1.13),
    new T.MeshStandardMaterial({map:petaCermin,roughness:.34,metalness:.12,
      emissive:0xffffff,emissiveMap:petaCermin,emissiveIntensity:.16}));
  cermin.position.set(-.25,1.85,.088); A.add(cermin);
  if(window.MENTOR_PNG){
    const im=new Image();
    im.onload=()=>gantiTekstur(cermin, isiCermin(im));
    im.src=window.MENTOR_PNG;
  }
  /* gantungan handuk */
  const btg=new T.Mesh(silinder(.014,.014,.62,10),matKrom);
  btg.rotation.z=Math.PI/2; btg.position.set(.62,1.6,.06); A.add(btg);
  [-.16,.16].forEach(dx=>{
    const h=new T.Mesh(kotakBulat(.24,.5,.05,.02),matHanduk);
    h.position.set(.62+dx,1.34,.08); h.castShadow=true; A.add(h);
  });

  /* ===== stasiun tengah: trolly kosong + rak alat ===== */
  const B=new T.Group(); B.position.set(0,0,-R.d/2+.5); g.add(B);
  /* rak dinding tempat alat berjajar */
  [1.05,1.52,1.99].forEach(y=>{
    const p=new T.Mesh(kotakBulat(2.5,.05,.3,.012),matKayuGelap);
    p.position.set(0,y,-.42); p.castShadow=p.receiveShadow=true; B.add(p);
  });
  /* Alat di rak ditampilkan sebagai papan bergambar, bukan kotak polos.
     Ilustrasinya berlatar transparan sehingga siluetnya terbaca sebagai
     bendanya sendiri. */
  grupRakAlat=B;      /* diisi belakangan lewat isiRakAlat() */

  /* trolly */
  const tr=new T.Group(); tr.position.set(.15,0,.95); tr.rotation.y=-.28; B.add(tr);
  const W=.66, D=.46, tinggi=.9;
  const rakMat=new T.MeshStandardMaterial({color:0xf3f2ef,roughness:.32,metalness:.07});
  [0,.44,.88].forEach(y=>{
    const r=new T.Mesh(kotakBulat(W,.03,D,.012),rakMat);
    r.position.y=y+.14; r.castShadow=r.receiveShadow=true; tr.add(r);
    trollyRak.push(r);
  });
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const t=new T.Mesh(silinder(.017,.017,tinggi,12),matKrom);
    t.position.set(sx*(W/2-.03),tinggi/2+.12,sz*(D/2-.03)); t.castShadow=true; tr.add(t);
    const roda=new T.Mesh(new T.SphereGeometry(.034,12,10),
      new T.MeshStandardMaterial({color:0x2a2a2e,roughness:.5,metalness:.3}));
    roda.position.set(sx*(W/2-.03),.036,sz*(D/2-.03)); roda.castShadow=true; tr.add(roda);
  });
  const peg=new T.Mesh(new T.TorusGeometry(.11,.014,10,20,Math.PI),matKrom);
  peg.position.set(0,tinggi+.14,-D/2+.02); peg.rotation.set(Math.PI/2,0,0);
  peg.castShadow=true; tr.add(peg);

  /* ===== stasiun kanan: meja penerimaan klien ===== */
  const C=new T.Group(); C.position.set(3.2,0,-R.d/2+.9); g.add(C);
  const dsk=new T.Mesh(kotakBulat(1.9,.08,.75,.025),matKayuGelap);
  dsk.position.y=.76; dsk.castShadow=dsk.receiveShadow=true; C.add(dsk);
  const panel=new T.Mesh(kotakBulat(1.9,.72,.06,.02),matKayuGelap);
  panel.position.set(0,.38,-.34); panel.castShadow=true; C.add(panel);
  [[-1,1],[1,1]].forEach(([sx])=>{
    const k=new T.Mesh(kotakBulat(.07,.72,.07,.015),matKayuGelap);
    k.position.set(sx*.88,.36,.3); k.castShadow=true; C.add(k);
  });
  /* formulir anamnesis */
  const map=new T.Mesh(kotakBulat(.3,.4,.02,.008),
    new T.MeshStandardMaterial({color:0x8a5a33,roughness:.55}));
  map.position.set(-.4,.81,.06); map.rotation.set(-Math.PI/2,0,.22); map.castShadow=true; C.add(map);
  const krt=new T.Mesh(new T.PlaneGeometry(.26,.35),
    new T.MeshStandardMaterial({color:0xfbf7ef,roughness:.94}));
  krt.position.set(-.4,.822,.06); krt.rotation.set(-Math.PI/2,0,.22); C.add(krt);
  /* pena, gelas air, tanaman kecil */
  const pena=new T.Mesh(silinder(.007,.007,.14,8),
    new T.MeshStandardMaterial({color:0x2f2a30,roughness:.4,metalness:.3}));
  pena.rotation.set(Math.PI/2,0,.5); pena.position.set(-.16,.815,.16); C.add(pena);
  const gelas=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.035,.003),new T.Vector2(.04,.09),new T.Vector2(.042,.1)],18),
    new T.MeshPhysicalMaterial({color:0xffffff,roughness:.06,transmission:.85,thickness:.2,ior:1.45}));
  gelas.position.set(.45,.8,.1); gelas.castShadow=true; C.add(gelas);
  const potK=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.07,0),new T.Vector2(.08,.1),new T.Vector2(.085,.12)],18),
    new T.MeshStandardMaterial({color:0xb08a62,roughness:.8}));
  potK.position.set(.72,.8,-.12); potK.castShadow=true; C.add(potK);
  for(let i=0;i<6;i++){
    const d=new T.Mesh(new T.SphereGeometry(.045,10,8),
      new T.MeshStandardMaterial({color:0x4f7a3f,roughness:.7}));
    const aa=i*1.05;
    d.position.set(.72+Math.cos(aa)*.05,.94+i*.02,-.12+Math.sin(aa)*.05);
    d.scale.set(1,.6,1.5); d.castShadow=true; C.add(d);
  }
  /* kursi klien */
  const kur=new T.Group(); kur.position.set(0,0,1.0); kur.rotation.y=Math.PI; C.add(kur);
  const dud=new T.Mesh(kotakBulat(.46,.09,.44,.035),matKainKrem);
  dud.position.y=.45; dud.castShadow=dud.receiveShadow=true; kur.add(dud);
  const snd=new T.Mesh(kotakBulat(.46,.52,.07,.03),matKainKrem);
  snd.position.set(0,.74,-.19); snd.rotation.x=-.1; snd.castShadow=true; kur.add(snd);
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const k=new T.Mesh(silinder(.018,.023,.45,10),matKayuGelap);
    k.position.set(sx*.18,.225,sz*.17); k.castShadow=true; kur.add(k);
  });

  /* papan nama tiap stasiun */
  [[-3.1,'1 · PERSIAPAN DIRI'],[0,'2 · ALAT & BAHAN'],[3.2,'3 · PENERIMAAN KLIEN']].forEach(([px,tx])=>{
    const peta=tekstur(kanvas(512,96,(x,w,h)=>{
      x.fillStyle='#5a3b22'; x.fillRect(0,0,w,h);
      x.fillStyle='#f0d79a'; x.font='bold 40px "Segoe UI",sans-serif';
      x.textAlign='center'; x.fillText(tx,w/2,60);
    }),1,1);
    const pl=new T.Mesh(new T.PlaneGeometry(1.25,.235),
      new T.MeshStandardMaterial({map:peta,roughness:.6,emissive:0xffffff,
        emissiveMap:peta,emissiveIntensity:.25}));
    pl.position.set(px,2.55,-R.d/2+.05); g.add(pl);
  });

  /* pencahayaan ruangan */
  [-3.1,0,3.2].forEach(px=>{
    const kap=new T.Mesh(new T.LatheGeometry(
      [new T.Vector2(.02,.14),new T.Vector2(.1,.05),new T.Vector2(.115,0)],18),
      new T.MeshStandardMaterial({color:0xd9c39a,roughness:.44,metalness:.35,side:T.DoubleSide}));
    kap.position.set(px,R.t-.3,-1.0); kap.castShadow=true; g.add(kap);
    const bola=new T.Mesh(new T.SphereGeometry(.05,14,10),new T.MeshBasicMaterial({color:0xffdca6}));
    bola.position.set(px,R.t-.34,-1.0); g.add(bola);
    const sinar=new T.SpotLight(0xffdcb0,11,7,.9,.7,1.3);
    sinar.position.set(px,R.t-.34,-1.0);
    sinar.target.position.set(px,.7,-2.2); g.add(sinar,sinar.target);
  });
  const isianD=new T.PointLight(0xcfe0ff,4,10,2); isianD.position.set(-1.5,1.9,2.6); g.add(isianD);
  const hangatD=new T.PointLight(0xffd2a0,5,12,1.7); hangatD.position.set(1.0,2.6,.6); g.add(hangatD);
  g.add(new T.HemisphereLight(0xffe6cc,0x3a2620,.72));

  /* berdiri di seberang meja penerimaan, di sisi terapis */
  taruhMentor(g,{x:3.15,z:-3.02,ofs:OFS3,emisi:.4});
  RUANGAN.persiapan=g;
}
buatRuangPersiapan();

/* Alat yang dipilih benar diletakkan sungguhan di atas rak trolly. */
function taruhDiTrolly(warna, id){
  const rak=trollyRak[Math.min(2,Math.floor(trollyIsi/4))];
  if(!rak) return;
  const n=trollyIsi%4;
  const ikon=id && IKON_ALAT[id] && window.ALAT_GBR && window.ALAT_GBR[IKON_ALAT[id]];
  const b=new T.Mesh(new T.PlaneGeometry(.19,.19),
    new T.MeshStandardMaterial({transparent:true,alphaTest:.35,roughness:.85,
      metalness:0,side:T.DoubleSide,emissive:0xffffff,emissiveIntensity:.18}));
  if(ikon){
    new T.TextureLoader().load(ikon, peta=>{
      peta.colorSpace=T.SRGBColorSpace; peta.anisotropy=8;
      b.material.map=peta; b.material.emissiveMap=peta; b.material.needsUpdate=true;
    });
  }else{
    const alt=ALAT.find(a=>a.id===id);
    const peta=tekstur(kartuAlat(alt?alt.ik:'🧺'),1,1);
    b.material.map=peta; b.material.emissiveMap=peta; b.material.needsUpdate=true;
  }
  if(rakAlat[id]) rakAlat[id].visible=false;      /* pindah dari rak ke trolly */
  b.position.set(-.19+(n%2)*.26, .115, -.11+Math.floor(n/2)*.24);
  b.rotation.y=acak(-.2,.2); b.castShadow=true;
  rak.add(b);
  trollyIsi++;
  const yAsal=b.position.y;
  b.position.y=yAsal+.5; b.scale.setScalar(.01);
  let t=0;
  perlu((w,dt)=>{                          /* jatuh mendarat singkat */
    if(t>=1) return;
    t=Math.min(1,t+dt*3.4);
    const e=1-Math.pow(1-t,3);
    b.position.y=yAsal+.5*(1-e);
    b.scale.setScalar(.01+e*.99);
  });
}
function kosongkanTrolly(){
  trollyRak.forEach(r=>[...r.children].forEach(c=>r.remove(c)));
  trollyIsi=0;
  Object.keys(rakAlat).forEach(k=>{ rakAlat[k].visible=true; });   /* rak terisi lagi */
}


/* ---------- 4e. RUANG PENGAKHIRAN (menu 5) ----------
   Ruang perawatan seusai sesi: lenan bersih terlipat, troli teh mengepul,
   keranjang lenan kotor, dan stasiun sanitasi. */
const OFS4 = 120;

function buatRuangPengakhiran(){
  const R={l:7.6,t:3.0,d:6.4};
  const g=new T.Group(); g.position.set(OFS4,0,0); scene.add(g);

  const lantai=new T.Mesh(new T.PlaneGeometry(R.l,R.d),matLantai);
  lantai.rotation.x=-Math.PI/2; lantai.receiveShadow=true; g.add(lantai);
  const sisi=(w,h,mat,pos,rot)=>{
    const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.receiveShadow=true; g.add(m);
  };
  sisi(R.l,R.t,matDindingBelakang,[0,R.t/2,-R.d/2]);
  sisi(R.d,R.t,matDinding,[-R.l/2,R.t/2,0],[0,Math.PI/2,0]);
  sisi(R.d,R.t,matDinding,[ R.l/2,R.t/2,0],[0,-Math.PI/2,0]);
  sisi(R.l,R.t,matDinding,[0,R.t/2, R.d/2],[0,Math.PI,0]);
  sisi(R.l,R.d,matLangit,[0,R.t,0],[Math.PI/2,0,0]);
  [[R.l,[0,.065,-R.d/2+.03],null],
   [R.d,[-R.l/2+.03,.065,0],[0,Math.PI/2,0]],
   [R.d,[ R.l/2-.03,.065,0],[0,-Math.PI/2,0]]].forEach(([w,pos,rot])=>{
    const m=new T.Mesh(kotakBulat(w,.13,.05,.015),matKayuGelap);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.castShadow=m.receiveShadow=true; g.add(m);
  });

  /* meja perawatan yang sudah dirapikan */
  const bed=new T.Group(); bed.position.set(-1.2,0,-1.0); bed.rotation.y=.14; g.add(bed);
  const P=2.05,L=.78,tb=.64;
  const rangka=new T.Mesh(kotakBulat(P,.1,L,.03),matKayuGelap);
  rangka.position.y=tb; rangka.castShadow=rangka.receiveShadow=true; bed.add(rangka);
  const kasur=new T.Mesh(kotakBulat(P-.04,.17,L-.03,.07),matKainKrem);
  kasur.position.y=tb+.13; kasur.castShadow=kasur.receiveShadow=true; bed.add(kasur);
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const k=new T.Mesh(kotakBulat(.075,tb,.075,.014),matKayuGelap);
    k.position.set(sx*(P/2-.14),tb/2,sz*(L/2-.12)); k.castShadow=true; bed.add(k);
  });
  /* tiga lenan bersih terlipat rapi di atasnya */
  [0,1,2].forEach(i=>{
    const h=new T.Mesh(kotakBulat(.5,.045,L-.1,.018),matHanduk);
    h.position.set(-.55+i*.55, tb+.235+i*.005, 0); h.rotation.y=acak(-.02,.02);
    h.castShadow=true; bed.add(h);
  });
  const gulung=new T.Mesh(silinder(.085,.085,L-.12,18),matHanduk);
  gulung.rotation.x=Math.PI/2; gulung.position.set(P/2-.22,tb+.28,0);
  gulung.castShadow=true; bed.add(gulung);

  /* troli teh + uap */
  const teh=new T.Group(); teh.position.set(1.55,0,.35); teh.rotation.y=-.4; g.add(teh);
  [0,.42].forEach(y=>{
    const r=new T.Mesh(kotakBulat(.56,.03,.4,.012),
      new T.MeshStandardMaterial({color:0xf3f2ef,roughness:.32,metalness:.07}));
    r.position.y=y+.4; r.castShadow=r.receiveShadow=true; teh.add(r);
  });
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const t=new T.Mesh(silinder(.015,.015,.84,12),matKrom);
    t.position.set(sx*.25,.42,sz*.17); t.castShadow=true; teh.add(t);
  });
  const teko=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.09,.01),new T.Vector2(.11,.09),
     new T.Vector2(.085,.15),new T.Vector2(.045,.17),new T.Vector2(.05,.19)],22),
    new T.MeshStandardMaterial({color:0xd8cdbb,roughness:.35,metalness:.1}));
  teko.position.set(-.12,.85,0); teko.castShadow=true; teh.add(teko);
  const cerat=new T.Mesh(new T.TorusGeometry(.07,.014,8,16,Math.PI*.7),
    new T.MeshStandardMaterial({color:0xd8cdbb,roughness:.35,metalness:.1}));
  cerat.position.set(.0,.93,0); cerat.rotation.set(0,0,-.6); teh.add(cerat);
  [[.16,.06],[.16,-.1]].forEach(([cx,cz])=>{
    const cg=new T.Mesh(new T.LatheGeometry(
      [new T.Vector2(0,0),new T.Vector2(.035,.004),new T.Vector2(.042,.055),new T.Vector2(.044,.065)],18),
      new T.MeshStandardMaterial({color:0xf2ece2,roughness:.26}));
    cg.position.set(cx,.85,cz); cg.castShadow=true; teh.add(cg);
  });
  buatUap(new T.Vector3(OFS4+1.42,1.05,.35),40,.75,.03,.05,0xffe0bb,.05);

  /* keranjang lenan kotor */
  const krj=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.24,0),new T.Vector2(.28,.42),new T.Vector2(.29,.46)],22),
    new T.MeshStandardMaterial({color:0xb08a62,roughness:.85}));
  krj.position.set(-3.0,0,.9); krj.castShadow=krj.receiveShadow=true; g.add(krj);
  for(let i=0;i<4;i++){
    const h=new T.Mesh(kotakBulat(.2,.1,.18,.04),matHanduk);
    h.position.set(-3.0+acak(-.12,.12),.44+i*.045,.9+acak(-.12,.12));
    h.rotation.set(acak(-.3,.3),acak(0,3),acak(-.3,.3)); h.castShadow=true; g.add(h);
  }

  /* rak lenan bersih + botol disinfektan */
  const rak=new T.Group(); rak.position.set(R.l/2-.2,0,-1.2); rak.rotation.y=-Math.PI/2; g.add(rak);
  [.95,1.4,1.85].forEach(y=>{
    const p2=new T.Mesh(kotakBulat(1.3,.045,.32,.012),matKayuGelap);
    p2.position.set(0,y,0); p2.castShadow=p2.receiveShadow=true; rak.add(p2);
  });
  for(let i=0;i<12;i++){
    const h=new T.Mesh(silinder(.058,.058,.26,14),matHanduk);
    h.rotation.z=Math.PI/2;
    h.position.set(-.5+(i%6)*.2, .95+Math.floor(i/6)*.45+.07, 0);
    h.castShadow=true; rak.add(h);
  }
  const dis=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.05,0),new T.Vector2(.055,.16),
     new T.Vector2(.025,.19),new T.Vector2(.028,.24)],18),
    new T.MeshPhysicalMaterial({color:0x9fd0c4,roughness:.14,transmission:.6,thickness:.3,ior:1.45}));
  dis.position.set(.42,1.87,0); dis.castShadow=true; rak.add(dis);

  /* lilin penutup di meja sudut */
  const mj=new T.Mesh(silinder(.26,.28,.5,20),matKayuGelap);
  mj.position.set(2.9,.25,-2.2); mj.castShadow=mj.receiveShadow=true; g.add(mj);
  const texG=tekstur(texKilau(),1,1);
  [[-.09,.04],[.08,-.05]].forEach(([lx,lz],i)=>{
    const bd=new T.Mesh(silinder(.035,.037,.14,16),
      new T.MeshStandardMaterial({color:0xf7ecd6,roughness:.55,emissive:0xffb774,emissiveIntensity:.16}));
    bd.position.set(2.9+lx,.57,-2.2+lz); bd.castShadow=true; g.add(bd);
    const api=new T.Mesh(new T.ConeGeometry(.013,.05,10),
      new T.MeshBasicMaterial({color:0xffcf7a,transparent:true,opacity:.95,
        blending:T.AdditiveBlending,depthWrite:false}));
    api.position.set(2.9+lx,.665,-2.2+lz); g.add(api);
    const kl=new T.Sprite(new T.SpriteMaterial({map:texG,color:0xffb765,transparent:true,
      opacity:.45,blending:T.AdditiveBlending,depthWrite:false}));
    kl.scale.set(.24,.24,1); kl.position.copy(api.position); g.add(kl);
    const ch=new T.PointLight(0xffa24d,1.2,1.8,2); ch.position.copy(api.position); g.add(ch);
    const f=i*2.3;
    perlu(w=>{ const n=Math.sin(w*11+f)*.5+Math.sin(w*24+f*2)*.3;
      api.scale.set(1+n*.13,1+n*.3,1+n*.13); ch.intensity=1.1+n*.4; kl.scale.setScalar(.23+n*.05); });
  });

  const isianP=new T.PointLight(0xcfe0ff,3.4,9,2); isianP.position.set(-2.4,1.9,2.4); g.add(isianP);
  const hangatP=new T.PointLight(0xffcf9a,7,11,1.7); hangatP.position.set(0,2.5,-.4); g.add(hangatP);
  g.add(new T.HemisphereLight(0xffe0c2,0x3a2620,.6));
  taruhMentor(g,{x:.35,z:-1.5,ofs:OFS4,emisi:.4});
  RUANGAN.pengakhiran=g;
}
buatRuangPengakhiran();

/* ---------- 4f. RUANG HASIL (menu 7) ----------
   Ceruk penghargaan: bingkai sertifikat besar yang teksturnya DIBANGKITKAN
   ULANG mengikuti capaian pengguna, tugu piala, dan mentor mengucapkan
   selamat. Lihat perbaruiSertifikat(). */
const OFS5 = 150;
let meshSertifikat=null;

function texSertifikat3D(nilai,mutu,tuntas,total){
  return kanvas(1200,860,(x,w,h)=>{
    const g=x.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#fffdf7'); g.addColorStop(1,'#f4e9d6');
    x.fillStyle=g; x.fillRect(0,0,w,h);
    x.strokeStyle='#c9a227'; x.lineWidth=12; x.strokeRect(34,34,w-68,h-68);
    x.strokeStyle='#e4cf87'; x.lineWidth=3;  x.strokeRect(58,58,w-116,h-116);
    x.textAlign='center';
    x.fillStyle='#8a6b1f'; x.font='bold 26px "Segoe UI",sans-serif';
    x.fillText('REKAP HASIL BELAJAR', w/2, 150);
    x.fillStyle='#3a2e46'; x.font='italic 66px Georgia';
    x.fillText('Laboratorium Maya', w/2, 244);
    x.fillStyle='#6b4c8a'; x.font='30px Georgia';
    x.fillText('Anatomi & Fisiologi untuk Kecantikan dan Spa', w/2, 296);
    x.strokeStyle='#c9a227'; x.lineWidth=3;
    x.beginPath(); x.moveTo(w/2-200,330); x.lineTo(w/2+200,330); x.stroke();
    x.fillStyle='#8a7d94'; x.font='22px "Segoe UI",sans-serif';
    x.fillText(`Telah menuntaskan ${tuntas} dari ${total} capaian ruang praktik`, w/2, 386);
    x.fillStyle='#2f9c68'; x.font='bold 128px Georgia';
    x.fillText(String(nilai), w/2, 520);
    x.fillStyle='#6b4c8a'; x.font='bold 34px Georgia';
    x.fillText(mutu, w/2, 572);
    const bintang=Math.max(1,Math.round(nilai/20));
    x.fillStyle='#c9a227'; x.font='46px Georgia';
    x.fillText('★'.repeat(bintang)+'☆'.repeat(5-bintang), w/2, 648);
    x.fillStyle='#6b6072'; x.font='19px "Segoe UI",sans-serif';
    x.fillText('SMK — Fase E · Dasar-Dasar Kecantikan dan SPA', w/2, 730);
  });
}

function buatRuangHasil(){
  const R={l:7.0,t:3.2,d:6.2};
  const g=new T.Group(); g.position.set(OFS5,0,0); scene.add(g);

  const lantai=new T.Mesh(new T.PlaneGeometry(R.l,R.d),matLantai);
  lantai.rotation.x=-Math.PI/2; lantai.receiveShadow=true; g.add(lantai);
  const sisi=(w,h,mat,pos,rot)=>{
    const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.receiveShadow=true; g.add(m);
  };
  sisi(R.l,R.t,matDindingBelakang,[0,R.t/2,-R.d/2]);
  sisi(R.d,R.t,matDinding,[-R.l/2,R.t/2,0],[0,Math.PI/2,0]);
  sisi(R.d,R.t,matDinding,[ R.l/2,R.t/2,0],[0,-Math.PI/2,0]);
  sisi(R.l,R.t,matDinding,[0,R.t/2, R.d/2],[0,Math.PI,0]);
  sisi(R.l,R.d,matLangit,[0,R.t,0],[Math.PI/2,0,0]);
  [[R.l,[0,.065,-R.d/2+.03],null],
   [R.d,[-R.l/2+.03,.065,0],[0,Math.PI/2,0]],
   [R.d,[ R.l/2-.03,.065,0],[0,-Math.PI/2,0]]].forEach(([w,pos,rot])=>{
    const m=new T.Mesh(kotakBulat(w,.13,.05,.015),matKayuGelap);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.castShadow=m.receiveShadow=true; g.add(m);
  });

  /* sertifikat kini ditayangkan pada televisi layar datar yang menempel di
     dinding, bukan pigura kayu bersorot lampu. */
  const pg=new T.Group(); pg.position.set(-.8,1.78,-R.d/2+.08); g.add(pg);
  const bing=new T.Mesh(kotakBulat(2.85,2.12,.055,.018),matBezel);
  bing.castShadow=bing.receiveShadow=true; pg.add(bing);
  const dudukan=new T.Mesh(kotakBulat(.6,.48,.05,.012),
    new T.MeshStandardMaterial({color:0x151317,roughness:.6,metalness:.3}));
  dudukan.position.z=-.05; pg.add(dudukan);
  const kain=tekstur(texSertifikat3D(0,'Belum Dinilai',0,9),1,1);
  const isi=new T.Mesh(new T.PlaneGeometry(2.62,1.9),
    new T.MeshStandardMaterial({map:kain,roughness:.22,metalness:.05,
      emissive:0xffffff,emissiveMap:kain,emissiveIntensity:.5}));
  isi.position.z=.038; pg.add(isi);
  meshSertifikat=isi;
  const ledHs=new T.Mesh(new T.SphereGeometry(.012,10,8),
    new T.MeshBasicMaterial({color:0x6fe3a8}));
  ledHs.position.set(1.30,-1.005,.035); pg.add(ledHs);

  /* tugu piala */
  const tugu=new T.Group(); tugu.position.set(1.75,0,-1.5); g.add(tugu);
  const alas=new T.Mesh(kotakBulat(.62,.9,.62,.03),
    new T.MeshStandardMaterial({color:0xe8e2d8,roughness:.35,metalness:.08}));
  alas.position.y=.45; alas.castShadow=alas.receiveShadow=true; tugu.add(alas);
  const matEmas=new T.MeshStandardMaterial({color:0xd9b45a,roughness:.22,metalness:.92});
  const kaki=new T.Mesh(silinder(.07,.13,.1,20),matEmas);
  kaki.position.y=.95; kaki.castShadow=true; tugu.add(kaki);
  const btg2=new T.Mesh(silinder(.035,.035,.13,14),matEmas);
  btg2.position.y=1.06; tugu.add(btg2);
  const mangkok=new T.Mesh(new T.LatheGeometry(
    [new T.Vector2(0,0),new T.Vector2(.1,.02),new T.Vector2(.15,.14),new T.Vector2(.16,.2)],22),matEmas);
  mangkok.position.y=1.12; mangkok.castShadow=true; tugu.add(mangkok);
  [-1,1].forEach(s2=>{
    const tel=new T.Mesh(new T.TorusGeometry(.055,.014,8,16,Math.PI),matEmas);
    tel.position.set(s2*.17,1.22,0); tel.rotation.set(0,0,s2>0?-Math.PI/2:Math.PI/2);
    tel.castShadow=true; tugu.add(tel);
  });
  const kilauT=new T.Sprite(new T.SpriteMaterial({map:tekstur(texKilau(),1,1),color:0xffe0a0,
    transparent:true,opacity:.4,blending:T.AdditiveBlending,depthWrite:false}));
  kilauT.scale.set(.8,.8,1); kilauT.position.set(0,1.22,0); tugu.add(kilauT);
  perlu(w=>{ kilauT.scale.setScalar(.72+Math.sin(w*1.4)*.09); tugu.rotation.y=Math.sin(w*.2)*.12; });

  /* permadani merah + tanaman */
  const kar=new T.Mesh(new T.PlaneGeometry(2.6,3.4),
    new T.MeshStandardMaterial({map:tekstur(texKain('#7a3038'),4,5),roughness:1,color:0xb06a70}));
  kar.rotation.x=-Math.PI/2; kar.position.set(-.8,.008,-.4);
  kar.receiveShadow=true; g.add(kar);
  [-3.0,3.0].forEach(px=>{
    const pot=new T.Mesh(new T.LatheGeometry(
      [new T.Vector2(0,0),new T.Vector2(.16,0),new T.Vector2(.2,.06),
       new T.Vector2(.23,.34),new T.Vector2(.24,.38)],24),
      new T.MeshStandardMaterial({color:0x9c6a4a,roughness:.78}));
    pot.position.set(px,0,-2.6); pot.castShadow=pot.receiveShadow=true; g.add(pot);
    for(let i=0;i<8;i++){
      const d=new T.Mesh(new T.SphereGeometry(.1,10,8),
        new T.MeshStandardMaterial({color:0x44703a,roughness:.7}));
      const aa=i*1.4;
      d.position.set(px+Math.cos(aa)*acak(.05,.16),.44+i*.05,-2.6+Math.sin(aa)*acak(.05,.16));
      d.scale.set(1,.55,1.6); d.castShadow=true; g.add(d);
    }
  });

  const isianH=new T.PointLight(0xcfe0ff,3,9,2); isianH.position.set(-2.4,1.9,2.2); g.add(isianH);
  const hangatH=new T.PointLight(0xffd2a0,6,11,1.7); hangatH.position.set(.4,2.6,.6); g.add(hangatH);
  g.add(new T.HemisphereLight(0xffe6cc,0x3a2620,.7));

  taruhMentor(g,{x:-2.45,z:-2.2,ofs:OFS5,emisi:.4});
  RUANGAN.hasil=g;
}
buatRuangHasil();


/* ---------- 4g. RUANG PROSEDUR MASSAGE (menu 4) ----------
   Ruang praktik dengan tiga papan anatomi di dinding — Kaki, Punggung, dan
   Lengan & Dada — plus meja perawatan dan trolly minyak. Memilih tab area
   menyalakan lampu papannya dan memalingkan kamera ke arah papan.
   CATATAN: isi teks & fotonya disalin dari versi non-3D dan masih akan
   diperbarui manual; strukturnya sengaja dibuat mengikuti larik MASSAGE,
   GALERI, dan LANGKAH_KERJA supaya penggantian isinya cukup satu tempat. */
const OFS6 = 180;
const papanMassage = [];
let tayangAktif = null;      /* {src,judul} yang sedang ditayangkan di layar tengah */
let zoomLayar   = 0;         /* tingkat dekat layar tengah: 0 normal, 1 = 2x, 2 = 4x */
/* Jarak kamera ke layar tengah per tingkat, dan pergeseran titik pandang
   pada sumbu X. Tingkat 2 memerlukan seluruh lebar jendela, jadi panel
   samping ikut disurutkan (body.zoomPenuh) dan pergeserannya dinolkan supaya
   layar jatuh di tengah — kalau tidak, separuhnya tertutup panel.
   Jarak tingkat 2 dipilih dari pengukuran: pada jendela 1280px lebar tayangan
   menjadi ±1180px, muat utuh dengan sisa tepi. Lebar proyeksi sebanding
   dengan lebar jendela, jadi angka ini ikut pas di 1024 dan 800. */
const ZOOM_Z   = [2.8, -.25, -1.80];
const ZOOM_GSR = [.95, .95, 0];

/* Ruang materi dan ruang prosedur massage sama-sama memakai LAYAR TENGAH-nya
   sebagai monitor. Fungsi ini menunjuk unit layar yang berlaku di ruangan
   yang sedang dibuka; tiap unit menyimpan pulih() untuk mengembalikan
   tayangan topiknya sendiri. */
function monitorRuang(nm){
  if(nm==='massage') return papanMassage[1];
  if(nm==='materi')  return papanMateri[1];
  return null;
}

/* Kembalikan layar monitor ruangan ini ke tayangan topiknya sendiri. */
function pjLayarTopik(u){ if(u && u.pulih) u.pulih(); }

function buatRuangMassage(){
  const R={l:9.0,t:3.1,d:6.6};
  const g=new T.Group(); g.position.set(OFS6,0,0); scene.add(g);

  const lantai=new T.Mesh(new T.PlaneGeometry(R.l,R.d),matLantai);
  lantai.rotation.x=-Math.PI/2; lantai.receiveShadow=true; g.add(lantai);
  const sisi=(w,h,mat,pos,rot)=>{
    const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.receiveShadow=true; g.add(m);
  };
  sisi(R.l,R.t,matDindingBelakang,[0,R.t/2,-R.d/2]);
  sisi(R.d,R.t,matDinding,[-R.l/2,R.t/2,0],[0,Math.PI/2,0]);
  sisi(R.d,R.t,matDinding,[ R.l/2,R.t/2,0],[0,-Math.PI/2,0]);
  sisi(R.l,R.t,matDinding,[0,R.t/2, R.d/2],[0,Math.PI,0]);
  sisi(R.l,R.d,matLangit,[0,R.t,0],[Math.PI/2,0,0]);
  [[R.l,[0,.065,-R.d/2+.03],null],
   [R.d,[-R.l/2+.03,.065,0],[0,Math.PI/2,0]],
   [R.d,[ R.l/2-.03,.065,0],[0,-Math.PI/2,0]]].forEach(([w,pos,rot])=>{
    const m=new T.Mesh(kotakBulat(w,.13,.05,.015),matKayuGelap);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.castShadow=m.receiveShadow=true; g.add(m);
  });

  const AREA=[
    {x:-2.6, id:'kaki', judul:'KAKI', sub:'Telapak · Betis · Paha', warna:'#e0916a',
     poin:['Empat titik: plantar fascia, achilles, betis, paha',
           'Effleurage dari pergelangan menuju paha',
           '17 langkah kerja bervideo']},
    {x: 0, id:'punggung', judul:'PUNGGUNG', sub:'Pinggang · Punggung · Pundak', warna:'#b98fd8',
     poin:['Trapezius, latisimus dorsi, vertebrae, sacrum',
           'Hindari tekanan di atas ruas tulang belakang',
           'Layar ini juga menayangkan gambar pilihanmu']},
    {x: 2.6, id:'lengan_dan_dada', judul:'LENGAN & DADA', sub:'Bahu · Lengan · Dada', warna:'#e0836a',
     poin:['Clavicula, bicep, tricep, flexor',
           'Pijat dari pergelangan menuju bahu',
           '6 langkah kerja bervideo']}
  ];
  const matBezelM=new T.MeshStandardMaterial({color:0x1b181d,roughness:.3,metalness:.55});
  AREA.forEach(t=>{
    const pg=new T.Group(); pg.position.set(t.x,1.74,-R.d/2+.07); g.add(pg);
    const bezel=new T.Mesh(kotakBulat(2.2,1.32,.055,.018),matBezelM);
    bezel.castShadow=bezel.receiveShadow=true; pg.add(bezel);
    const dudukan=new T.Mesh(kotakBulat(.5,.4,.05,.012),
      new T.MeshStandardMaterial({color:0x151317,roughness:.6,metalness:.3}));
    dudukan.position.z=-.05; pg.add(dudukan);

    const peta=tekstur(layarTV(t.judul,t.sub,t.warna,t.poin,null),1,1);
    const layar=new T.Mesh(new T.PlaneGeometry(2.08,1.17),
      new T.MeshStandardMaterial({map:peta,roughness:.22,metalness:.05,
        emissive:0xffffff,emissiveMap:peta,emissiveIntensity:.5}));
    layar.position.z=.038; pg.add(layar);

    const led=new T.Mesh(new T.SphereGeometry(.012,10,8),
      new T.MeshBasicMaterial({color:0x6fe3a8}));
    led.position.set(.95,-.62,.042); pg.add(led);

    const unit={layar,led,t,gbrTopik:null};
    unit.pulih=()=>gantiTekstur(layar, layarTV(t.judul,t.sub,t.warna,t.poin,unit.gbrTopik));
    papanMassage.push(unit);
    /* ilustrasi topik dipasang begitu gambarnya selesai dimuat */
    if(window.TOPIK_GBR && window.TOPIK_GBR[t.id]){
      const img=new Image();
      img.onload=()=>{ unit.gbrTopik=img; if(!tayangAktif) unit.pulih(); };
      img.src=window.TOPIK_GBR[t.id];
    }
  });

  /* meja perawatan siap pakai */
  const bed=new T.Group(); bed.position.set(-.5,0,1.35); bed.rotation.y=.08; g.add(bed);
  const P=2.05,L=.78,tb=.64;
  const rangka=new T.Mesh(kotakBulat(P,.1,L,.03),matKayuGelap);
  rangka.position.y=tb; rangka.castShadow=rangka.receiveShadow=true; bed.add(rangka);
  const kasur=new T.Mesh(kotakBulat(P-.04,.17,L-.03,.07),matKainKrem);
  kasur.position.y=tb+.13; kasur.castShadow=kasur.receiveShadow=true; bed.add(kasur);
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const k=new T.Mesh(kotakBulat(.075,tb,.075,.014),matKayuGelap);
    k.position.set(sx*(P/2-.14),tb/2,sz*(L/2-.12)); k.castShadow=true; bed.add(k);
  });
  const sandaran=new T.Mesh(kotakBulat(.34,.11,.42,.05),matKainKrem);
  sandaran.position.set(-P/2-.1,tb+.16,0); sandaran.rotation.z=.16;
  sandaran.castShadow=true; bed.add(sandaran);
  const handuk=new T.Mesh(kotakBulat(.62,.045,L+.04,.02),matHanduk);
  handuk.position.set(.28,tb+.235,0); handuk.castShadow=true; bed.add(handuk);
  const gulung=new T.Mesh(silinder(.09,.09,L-.08,18),matHanduk);
  gulung.rotation.x=Math.PI/2; gulung.position.set(P/2-.2,tb+.28,0);
  gulung.castShadow=true; bed.add(gulung);

  /* trolly minyak di samping meja */
  const tr=new T.Group(); tr.position.set(1.55,0,1.0); tr.rotation.y=-.38; g.add(tr);
  [0,.42].forEach(y=>{
    const r=new T.Mesh(kotakBulat(.56,.03,.4,.012),
      new T.MeshStandardMaterial({color:0xf3f2ef,roughness:.32,metalness:.07}));
    r.position.y=y+.42; r.castShadow=r.receiveShadow=true; tr.add(r);
  });
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const t2=new T.Mesh(silinder(.015,.015,.86,12),matKrom);
    t2.position.set(sx*.25,.43,sz*.17); t2.castShadow=true; tr.add(t2);
  });
  [[-.13,.05,0xc98338],[.02,-.06,0x8fae6a],[.15,.05,0xe3ded2]].forEach(([bx,bz,c])=>{
    const b2=new T.Mesh(new T.LatheGeometry(
      [new T.Vector2(0,0),new T.Vector2(.042,0),new T.Vector2(.046,.13),
       new T.Vector2(.02,.16),new T.Vector2(.022,.2)],18),
      new T.MeshPhysicalMaterial({color:c,roughness:.1,transmission:.75,thickness:.4,ior:1.46}));
    b2.position.set(bx,.87,bz); b2.castShadow=true; tr.add(b2);
  });

  const isianM=new T.PointLight(0xcfe0ff,4,10,2); isianM.position.set(-2.2,1.9,2.6); g.add(isianM);
  const hangatM=new T.PointLight(0xffd2a0,6,12,1.7); hangatM.position.set(.4,2.6,.4); g.add(hangatM);
  g.add(new T.HemisphereLight(0xffe6cc,0x3a2620,.7));

  taruhMentor(g,{x:-2.3,z:.5,ofs:OFS6,emisi:.38});
  RUANGAN.massage=g;
}
buatRuangMassage();

/* ---------- 9. RUANG TES PENGETAHUAN (menu 5) ----------
   Mengikuti storyboard "PENILAIAN PENGETAHUAN" (anfis-5.jpeg): peserta
   menjodohkan nama otot ke bagian tubuh yang benar dengan menyeretnya —
   benar mendapat centang, salah mendapat silang.

   Petanya TIDAK dipasang sebagai tekstur pada layar 3D: berkas PNG terpisah
   diblokir sebagai tekstur WebGL lewat file://. Peta beserta kolom jawabannya
   hidup di panel HTML, sedangkan layar di ruangan hanya menampilkan judul dan
   skor yang digambar ke kanvas. */
const OFS7 = 210;
let layarTes=null;                      /* mesh layar; teksturnya diganti tiap skor berubah */

function texLayarTes(judul, benar, total){
  return kanvas(1024,576,(x,w,h)=>{
    const g=x.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#241a2e'); g.addColorStop(1,'#120d18');
    x.fillStyle=g; x.fillRect(0,0,w,h);
    x.strokeStyle='rgba(216,178,94,.5)'; x.lineWidth=4; x.strokeRect(26,26,w-52,h-52);
    x.textAlign='center';
    x.fillStyle='#d8b25e'; x.font='bold 30px "Segoe UI",sans-serif';
    x.fillText('TES PENGETAHUAN', w/2, 118);
    x.fillStyle='#f6efe4'; x.font='600 62px Georgia,serif';
    x.fillText(judul, w/2, 232);
    x.fillStyle='#a99b8c'; x.font='26px "Segoe UI",sans-serif';
    x.fillText('Seret nama otot ke kotak yang tepat', w/2, 300);
    const p=total?benar/total:0;
    x.fillStyle='rgba(255,255,255,.1)'; x.beginPath(); x.roundRect(212,364,600,34,17); x.fill();
    x.fillStyle=p===1?'#6fe3a8':'#d8b25e';
    x.beginPath(); x.roundRect(212,364,Math.max(34,600*p),34,17); x.fill();
    x.fillStyle='#f6efe4'; x.font='bold 34px "Segoe UI",sans-serif';
    x.fillText(`${benar} / ${total} benar`, w/2, 470);
  });
}

function buatRuangTes(){
  const R={l:7.4,t:3.0,d:6.4};
  const g=new T.Group(); g.position.set(OFS7,0,0); scene.add(g);

  const lantai=new T.Mesh(new T.PlaneGeometry(R.l,R.d),matLantai);
  lantai.rotation.x=-Math.PI/2; lantai.receiveShadow=true; g.add(lantai);
  const sisi=(w,h,mat,pos,rot)=>{
    const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.receiveShadow=true; g.add(m);
  };
  sisi(R.l,R.t,matDindingBelakang,[0,R.t/2,-R.d/2]);
  sisi(R.d,R.t,matDinding,[-R.l/2,R.t/2,0],[0,Math.PI/2,0]);
  sisi(R.d,R.t,matDinding,[ R.l/2,R.t/2,0],[0,-Math.PI/2,0]);
  sisi(R.l,R.t,matDinding,[0,R.t/2, R.d/2],[0,Math.PI,0]);
  sisi(R.l,R.d,matLangit,[0,R.t,0],[Math.PI/2,0,0]);
  [[R.l,[0,.065,-R.d/2+.03],null],
   [R.d,[-R.l/2+.03,.065,0],[0,Math.PI/2,0]],
   [R.d,[ R.l/2-.03,.065,0],[0,-Math.PI/2,0]]].forEach(([w,pos,rot])=>{
    const m=new T.Mesh(kotakBulat(w,.13,.05,.015),matKayuGelap);
    m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.castShadow=m.receiveShadow=true; g.add(m);
  });

  /* televisi layar datar menempel di dinding, seperti ruangan lain */
  const pg=new T.Group(); pg.position.set(-.9,1.66,-R.d/2+.07); g.add(pg);
  const bez=new T.Mesh(kotakBulat(2.62,2.66,.055,.018),matBezel);
  bez.castShadow=bez.receiveShadow=true; pg.add(bez);
  const dud=new T.Mesh(kotakBulat(.58,.46,.05,.012),
    new T.MeshStandardMaterial({color:0x151317,roughness:.6,metalness:.3}));
  dud.position.z=-.05; pg.add(dud);
  const peta=tekstur(texLayarTes('Punggung',0,4),1,1);   /* tampil sebelum overlay dipasang */
  layarTes=new T.Mesh(new T.PlaneGeometry(2.48,2.52),
    new T.MeshStandardMaterial({map:peta,roughness:.22,metalness:.05,
      emissive:0xffffff,emissiveMap:peta,emissiveIntensity:.72}));
  layarTes.position.z=.038; pg.add(layarTes);
  const led=new T.Mesh(new T.SphereGeometry(.012,10,8),
    new T.MeshBasicMaterial({color:0x6fe3a8}));
  led.position.set(1.16,-1.29,.035); pg.add(led);

  /* meja belajar + kursi menghadap layar */
  const mj=new T.Group(); mj.position.set(1.5,0,.55); mj.rotation.y=-.42; g.add(mj);
  const daun=new T.Mesh(kotakBulat(1.6,.06,.76,.02),matKayuGelap);
  daun.position.y=.75; daun.castShadow=daun.receiveShadow=true; mj.add(daun);
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const k=new T.Mesh(kotakBulat(.06,.73,.06,.012),matKayuGelap);
    k.position.set(sx*.7,.365,sz*.31); k.castShadow=true; mj.add(k);
  });
  /* buku catatan + pena di atas meja */
  const bk=new T.Mesh(kotakBulat(.32,.022,.24,.006),
    new T.MeshStandardMaterial({color:0xf3ece0,roughness:.8}));
  bk.position.set(-.12,.79,.02); bk.rotation.y=.12; bk.castShadow=true; mj.add(bk);
  const pena=new T.Mesh(silinder(.008,.008,.15,10),
    new T.MeshStandardMaterial({color:0x8a5a33,roughness:.5}));
  pena.rotation.z=Math.PI/2; pena.rotation.y=.5;
  pena.position.set(.16,.785,.06); mj.add(pena);

  const kursi=new T.Group(); kursi.position.set(1.62,0,1.62); kursi.rotation.y=-.42+Math.PI; g.add(kursi);
  const dud2=new T.Mesh(kotakBulat(.5,.1,.48,.04),matKainKrem);
  dud2.position.y=.44; dud2.castShadow=dud2.receiveShadow=true; kursi.add(dud2);
  const sandaran=new T.Mesh(kotakBulat(.5,.6,.09,.04),matKainKrem);
  sandaran.position.set(0,.76,-.2); sandaran.castShadow=true; kursi.add(sandaran);
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{
    const k=new T.Mesh(silinder(.022,.022,.44,10),matKayuGelap);
    k.position.set(sx*.2,.22,sz*.2); k.castShadow=true; kursi.add(k);
  });

  /* tanaman sudut supaya ruangan tidak terasa kosong */
  const pot=new T.Mesh(silinder(.17,.13,.3,16),
    new T.MeshStandardMaterial({color:0xb98b6a,roughness:.7}));
  pot.position.set(-3.0,.15,1.9); pot.castShadow=true; g.add(pot);
  for(let i=0;i<7;i++){
    const dn=new T.Mesh(new T.SphereGeometry(.19,10,8),
      new T.MeshStandardMaterial({color:0x4f8a53,roughness:.85}));
    dn.scale.set(1,.55,1);
    dn.position.set(-3.0+acak(-.2,.2),.36+i*.075,1.9+acak(-.2,.2));
    dn.castShadow=true; g.add(dn);
  }

  /* pencahayaan */
  const spot=new T.SpotLight(0xffdcb0,12,8,.9,.7,1.3);
  spot.position.set(-.9,R.t-.34,-.6); spot.target.position.set(-.9,1.7,-R.d/2);
  g.add(spot,spot.target);
  const isian=new T.PointLight(0xcfe0ff,4,10,2); isian.position.set(-1.4,2.0,2.4); g.add(isian);
  const hangat=new T.PointLight(0xffd2a0,5,12,1.7); hangat.position.set(1.4,2.5,.4); g.add(hangat);
  g.add(new T.HemisphereLight(0xffe6cc,0x3a2620,.72));

  taruhMentor(g,{x:-2.95,z:-2.6,ofs:OFS7,emisi:.46});
  RUANGAN.tes=g;
}
buatRuangTes();

setRuangTampak(null);

/* ---------- 5. PARTIKEL: UAP & DEBU CAHAYA ---------- */
function buatUap(asal,jumlah,tinggiMax,sebar,ukuran,warna,opasitas){
  const pos=new Float32Array(jumlah*3), data=[];
  for(let i=0;i<jumlah;i++){
    const d={t:Math.random(),laju:acak(.06,.16),ax:acak(-sebar,sebar),az:acak(-sebar,sebar),
             fase:acak(0,7),putar:acak(.2,.7)};
    data.push(d); pos[i*3]=asal.x; pos[i*3+1]=asal.y; pos[i*3+2]=asal.z;
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.BufferAttribute(pos,3));
  const p=new T.Points(geo,new T.PointsMaterial({map:texTitik,color:warna,size:ukuran,
    transparent:true,opacity:opasitas,blending:T.AdditiveBlending,depthWrite:false,
    sizeAttenuation:true}));
  p.renderOrder=3; scene.add(p);
  perlu((w,dt)=>{
    const a=geo.attributes.position;
    for(let i=0;i<jumlah;i++){
      const d=data[i];
      d.t+=dt*d.laju/tinggiMax;
      if(d.t>1){ d.t=0; d.ax=acak(-sebar,sebar); d.az=acak(-sebar,sebar); }
      const h=d.t*tinggiMax, lebar=1+d.t*2.6;
      a.setXYZ(i,
        asal.x+d.ax*lebar+Math.sin(w*d.putar+d.fase)*.05*d.t*3,
        asal.y+h,
        asal.z+d.az*lebar+Math.cos(w*d.putar*.8+d.fase)*.04*d.t*3);
    }
    a.needsUpdate=true;
    p.material.opacity=opasitas;
  });
  return p;
}
buatUap(new T.Vector3(2.144,.58,.815),MUTU.uap,1.05,.04,.07,0xffd9ae,.055);

/* debu yang melayang di dalam berkas cahaya jendela */
(function buatDebu(){
  const n=MUTU.debu, pos=new Float32Array(n*3), data=[];
  for(let i=0;i<n;i++){
    const d={x:acak(-3.2,.2),y:acak(.25,1.95),z:acak(-.7,1.7),
             vy:acak(.005,.022),fase:acak(0,7),amp:acak(.02,.07)};
    data.push(d); pos[i*3]=d.x; pos[i*3+1]=d.y; pos[i*3+2]=d.z;
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.BufferAttribute(pos,3));
  const p=new T.Points(geo,new T.PointsMaterial({map:texTitik,color:0xffe3bb,size:.019,
    transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
  scene.add(p);
  perlu((w,dt)=>{
    const a=geo.attributes.position;
    for(let i=0;i<n;i++){
      const d=data[i];
      d.y+=d.vy*dt; if(d.y>2.05){ d.y=.2; d.x=acak(-3.2,.2); d.z=acak(-.7,1.7); }
      a.setXYZ(i, d.x+Math.sin(w*.35+d.fase)*d.amp, d.y, d.z+Math.cos(w*.28+d.fase)*d.amp);
    }
    a.needsUpdate=true;
  });
})();

/* ---------- 6. HOTSPOT MENU ---------- */
const MENU=[
 {no:1, ik:'📌', n:'Pengantar Modul',        s:'Capaian & tujuan belajar',
  jangkar:new T.Vector3(-2.20,1.16,1.25), objek:'papan', ruang:'pengantar',
  d:'Kenali capaian pembelajaran, tujuan, dan alur modul sebelum masuk ke ruang praktik. Di sinilah perjalanan belajarmu dimulai.'},
 {no:2, ik:'📖', n:'Materi Anatomi',         s:'Kulit, rambut &amp; otot tubuh',
  jangkar:new T.Vector3(3.36,2.38,-.95), objek:'poster', ruang:'materi',
  d:'Pelajari struktur dan fungsi kulit, rambut, serta sistem otot tubuh — dasar dari setiap tindakan perawatan kecantikan dan spa.'},
 {no:3, ik:'🧺', n:'Persiapan Perawatan',    s:'Diri, alat &amp; klien',
  jangkar:new T.Vector3(1.72,1.32,-.45), objek:'trolley', ruang:'persiapan',
  d:'Siapkan diri sesuai SOP, tata alat dan bahan pada trolly, lalu lakukan anamnesis untuk menentukan kelayakan klien.'},
 {no:4, ik:'💆', n:'Prosedur Massage',       s:'Kaki, punggung, lengan',
  jangkar:new T.Vector3(-1.22,1.06,-1.15), objek:'bed', ruang:'massage',
  d:'Praktikkan teknik dasar massage pada meja perawatan — effleurage, petrissage, dan friction untuk tiap area tubuh.'},
 {no:5, ik:'📝', n:'Tes Pengetahuan',       s:'Jodohkan nama otot',
  jangkar:new T.Vector3(-1.55,1.30,-2.05), objek:'bingkai', ruang:'tes',
  d:'Uji pemahamanmu: seret nama otot ke bagian tubuh yang tepat pada punggung, kaki, serta lengan dan dada.'},
 {no:6, ik:'🍵', n:'Pengakhiran & After Care', s:'Penutup perawatan',
  jangkar:new T.Vector3(2.25,.70,.85), objek:'meja', ruang:'pengakhiran',
  d:'Tutup perawatan dengan rapi: bersihkan sisa minyak, sajikan air hangat, sampaikan saran after care, lalu sanitasi ruangan.'},
 {no:7, ik:'🏆', n:'Hasil',                  s:'Rekap capaian belajar',
  jangkar:new T.Vector3(-3.02,2.38,-3.88), objek:'sertifikat', ruang:'hasil',
  d:'Lihat rekap nilai praktik dan tes pengetahuanmu di Laboratorium Maya.'}
];

const wadahHotspot=document.getElementById('hotspot');
const sasaranRaycast=[];

/* ---------- URUTAN MENU ----------
   Menu dibuka satu per satu, TANPA SYARAT PENYELESAIAN: begitu sebuah menu
   pernah dibuka, menu sesudahnya ikut terbuka. Batasnya disimpan sebagai satu
   angka `maju.buka` = nomor menu terjauh yang boleh dibuka.

   SYARAT_MENU di bawah TIDAK lagi menjadi gerbang — ia hanya menentukan tanda
   centang hijau "tuntas" pada label, dan tetap memakai objek `maju` yang sama
   dengan rekap di ruang penghargaan supaya keduanya tidak berbeda pendapat.
   Isi larik ini SENGAJA berupa fungsi: `maju` dan afterTuntas() baru
   dideklarasikan jauh di bawah, dan pembangun hotspot berjalan lebih dulu —
   memanggilnya saat itu juga akan memicu galat "before initialization". */
const SYARAT_MENU={
  1:()=>!!maju.pengantar,
  2:()=>['kulit','rambut','otot'].every(k=>maju.materi[k]),
  3:()=>maju.diri && maju.alat && maju.klien,
  4:()=>['kaki','punggung','lengan'].every(k=>maju.massage[k]),
  5:()=>['punggung','kaki','lengan'].every(k=>maju.tes[k]),
  6:()=>afterTuntas(),
  7:()=>true
};
const menuTuntas  = no => SYARAT_MENU[no] ? !!SYARAT_MENU[no]() : false;
const menuTerbuka = no => no <= (maju.buka||1);

/* Membuka sebuah menu sekaligus membuka menu sesudahnya. */
function catatMenuDibuka(no){
  /* Membuka menu 5 (Tes Pengetahuan) sekaligus membuka Hasil: rekapnya
     dianggap boleh dilihat begitu tes dimulai, tidak perlu menunggu ruang
     pengakhiran lebih dulu. */
  const sampai = no===5 ? MENU.length : no+1;
  if((maju.buka||1) >= sampai) return;
  maju.buka = Math.min(sampai, MENU.length);
  simpanMaju();
}

/* Sesuaikan tampilan label menu dengan kemajuan terbaru. Dipanggil saat
   aplikasi siap dan tiap kali pengguna kembali ke ruang spa. */
function perbaruiKunciMenu(){
  MENU.forEach(m=>{
    m.terkunci = !menuTerbuka(m.no);
    if(!m.el) return;
    m.el.classList.toggle('terkunci', m.terkunci);
    m.el.classList.toggle('tuntas', !m.terkunci && menuTuntas(m.no));
    m.el.querySelector('.no').textContent = m.terkunci ? '🔒' : m.no;
  });
}
MENU.forEach((m,i)=>{
  /* penanda cahaya di dunia 3D */
  const kilau=new T.Sprite(new T.SpriteMaterial({map:tekstur(texKilau(),1,1),color:0xffd9a0,
    transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));
  kilau.scale.set(.5,.5,1); kilau.position.copy(m.jangkar); scene.add(kilau);
  m.kilau=kilau;

  /* Sasaran sorotan: bendanya sendiri (meja perawatan, trolly, bingkai, …)
     plus satu bola tembus pandang di titik label. Memakai benda asli membuat
     sorotan terasa wajar dan tetap tepat meski kamera bergeser mengikuti
     tetikus — bola kecil saja terlalu mudah meleset di tepi layar. */
  const bola=new T.Mesh(new T.SphereGeometry(.42,10,8),
    new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  bola.position.copy(m.jangkar); bola.userData.menu=i; scene.add(bola);
  sasaranRaycast.push(bola);
  const benda=menuObjek[m.objek];
  if(benda){ benda.userData.menu=i; sasaranRaycast.push(benda); }

  /* label HTML yang diproyeksikan dari posisi 3D */
  const el=document.createElement('div');
  el.className='hs'; el.style.transitionDelay=(i*70)+'ms';
  el.innerHTML=`<span class="no">${m.no}</span><span class="tk"><b>${m.n}</b><span>${m.s}</span></span>`;
  el.onclick=()=>bukaPanel(i);
  el.onpointerenter=()=>sorot(i,true);
  el.onpointerleave=()=>sorot(i,false);
  wadahHotspot.appendChild(el);
  m.el=el;

  perlu(w=>{                                  /* penanda berdenyut pelan */
    const d=.5+Math.sin(w*1.5+i)*.5;
    const red = m.terkunci ? .3 : 1;                 /* menu terkunci lebih redup */
    kilau.material.opacity = (m.aktif ? .34+d*.22 : .1+d*.06) * red;
    kilau.scale.setScalar(m.aktif ? .58+d*.08 : .44);
  });
});
function sorot(i,on){
  const m=MENU[i];
  m.aktif=on;
  m.el.classList.toggle('sorot',on);
  document.getElementById('barNama').textContent =
    on ? (m.terkunci ? `${m.n} — terkunci, selesaikan menu ${m.no-1} dulu` : m.n)
       : `${MENU.length===7?'tujuh':MENU.length} menu tersedia`;
  renderer.domElement.style.cursor = on ? (m.terkunci ? 'not-allowed' : 'pointer') : '';
}

/* proyeksi posisi 3D ke koordinat layar untuk tiap label */
const vTemp=new T.Vector3();
function perbaruiHotspot(){
  const w=innerWidth, h=innerHeight;
  MENU.forEach(m=>{
    vTemp.copy(m.jangkar).project(camera);
    const depan=vTemp.z<1;
    m.el.style.display = depan ? 'flex' : 'none';
    if(!depan) return;
    /* dijaga tetap di dalam bingkai supaya label tak terpotong tepi layar */
    const w2=m.el.offsetWidth/2, h2=m.el.offsetHeight/2;
    m.el.style.left=jepit((vTemp.x*.5+.5)*w, w2+6, w-w2-6)+'px';
    m.el.style.top =jepit((-vTemp.y*.5+.5)*h-34, h2+6, h-h2-74)+'px';
  });
}

/* sorotan lewat tetikus di ruang 3D */
const raycaster=new T.Raycaster();
const tetikus=new T.Vector2(-9,-9);
let sorotKini=-1;
addEventListener('pointermove',e=>{
  tetikus.set((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1);
  parallax.x=(e.clientX/innerWidth-.5);
  parallax.y=(e.clientY/innerHeight-.5);
});
function periksaSorot(){
  if(layar!=='menu') return;
  raycaster.setFromCamera(tetikus,camera);
  const kena=raycaster.intersectObjects(sasaranRaycast,false);
  const idx=kena.length?kena[0].object.userData.menu:-1;
  if(idx!==sorotKini){
    if(sorotKini>=0) sorot(sorotKini,false);
    if(idx>=0) sorot(idx,true);
    sorotKini=idx;
  }
}
renderer.domElement.addEventListener('click',()=>{
  if(layar==='menu' && sorotKini>=0) bukaPanel(sorotKini);
});

/* ---------- 7. KOREOGRAFI KAMERA ---------- */
const PANDANG={
  buka:{pos:new T.Vector3(1.62,1.42,3.28), lihat:new T.Vector3(-.75,1.06,-1.7), fov:54},
  menu:{pos:new T.Vector3(1.15,1.86,3.20), lihat:new T.Vector3(-.35,.92,-1.6), fov:64},
  pengantar:{pos:new T.Vector3(OFS+1.5,1.72,2.95), lihat:new T.Vector3(OFS+.2,1.58,-3.0), fov:54},
  materi:{pos:new T.Vector3(OFS2+.9,1.62,2.7), lihat:new T.Vector3(OFS2+1.25,1.58,-3.2), fov:48},
  persiapan:{pos:new T.Vector3(OFS3+.9,1.66,2.9), lihat:new T.Vector3(OFS3+1.3,1.32,-3.3), fov:50},
  pengakhiran:{pos:new T.Vector3(OFS4+1.3,1.64,2.8), lihat:new T.Vector3(OFS4+.8,1.26,-2.9), fov:52},
  hasil:{pos:new T.Vector3(OFS5+1.85,1.66,2.55), lihat:new T.Vector3(OFS5+1.0,1.5,-3.0), fov:50},
  massage:{pos:new T.Vector3(OFS6+.9,1.64,2.8), lihat:new T.Vector3(OFS6+1.25,1.58,-3.3), fov:48},
  tes:{pos:new T.Vector3(OFS7+.55,1.66,1.55), lihat:new T.Vector3(OFS7-.35,1.62,-3.3), fov:46}
};
let layar='muat';                       /* muat → buka → menu ⇄ pengantar */
const parallax={x:0,y:0};
const posKini =PANDANG.buka.pos.clone();
const lihatKini=PANDANG.buka.lihat.clone();
const posTuju =PANDANG.buka.pos.clone();
const lihatTuju=PANDANG.buka.lihat.clone();
let fovTuju=PANDANG.buka.fov, masuk=0, waktuLayar=0;

function keLayar(nama,lompat){
  layar=nama; waktuLayar=0;
  setRuangTampak(nama);
  const P=PANDANG[nama]||PANDANG.buka;
  posTuju.copy(P.pos); lihatTuju.copy(P.lihat); fovTuju=P.fov;
  if(nama==='buka') masuk=0;
  /* pindah ruangan: kamera dipindahkan seketika di balik layar yang meredup,
     bukan diluncurkan melintasi 30 satuan ruang kosong */
  if(lompat){
    posKini.copy(posTuju); lihatKini.copy(lihatTuju);
    camera.fov=fovTuju; camera.updateProjectionMatrix();
  }
}
function perbaruiKamera(dt,w){
  waktuLayar+=dt;
  const P=PANDANG[layar]||PANDANG.buka;
  posTuju.copy(P.pos); lihatTuju.copy(P.lihat);

  if(layar==='buka'){
    /* masuk perlahan ke dalam ruangan, lalu bernapas pelan */
    masuk=Math.min(1,masuk+dt/16);
    const e=1-Math.pow(1-masuk,3);
    posTuju.z-=e*.42; posTuju.x-=e*.34;
    posTuju.y+=Math.sin(w*.28)*.016;
    posTuju.x+=Math.sin(w*.19)*.05;
  }else if(layar==='menu'){
    /* mengedar sangat pelan supaya ruangan terasa hidup */
    posTuju.x+=Math.sin(w*.085)*.42;
    posTuju.z+=Math.cos(w*.062)*.2;
    posTuju.y+=Math.sin(w*.24)*.022;
    lihatTuju.x+=Math.sin(w*.085)*.12;
  }else if(layar==='pengantar'){
    posTuju.x+=Math.sin(w*.07)*.17;
    posTuju.y+=Math.sin(w*.23)*.016;
    lihatTuju.x+=Math.sin(w*.07)*.05;
  }else if(layar==='materi'){
    if(tayangAktif || zoomLayar){
      /* menghadap layar tengah, sama seperti ruang prosedur massage */
      const gsr=ZOOM_GSR[zoomLayar];
      posTuju.set(OFS2+gsr, 1.72, ZOOM_Z[zoomLayar]);
      lihatTuju.set(OFS2+gsr, 1.72, -3.3);
      posTuju.y += Math.sin(w*.22)*.012;
    }else{
      /* kamera berpaling ke papan topik yang sedang dipilih */
      const bx=[-2.55,0,2.55][materiAktif];
      posTuju.x = OFS2 + bx*.35 + .9 + Math.sin(w*.07)*.12;
      lihatTuju.x = OFS2 + bx + 1.25;
      posTuju.y += Math.sin(w*.22)*.015;
    }
  }else if(layar==='persiapan'){
    /* kamera berpaling ke stasiun yang sedang dikerjakan */
    const bx=[-3.1,0,3.2][spTab];
    posTuju.x = OFS3 + bx*.32 + .9 + Math.sin(w*.07)*.11;
    lihatTuju.x = OFS3 + bx + 1.3;
    posTuju.y += Math.sin(w*.22)*.015;
  }else if(layar==='tes'){
    /* Pada layar sempit panel berubah jadi lembar bawah yang menutupi separuh
       bawah jendela, jadi kamera ditarik mundur dan pandangannya diangkat agar
       seluruh layar soal tetap berada di paruh atas. */
    if(innerWidth<=820){ posTuju.z += 1.15; }
    posTuju.y += Math.sin(w*.22)*.012;
  }else if(layar==='massage'){
    if(tayangAktif || zoomLayar){
      /* Menghadap layar tengah. Titik pandang digeser 0,95 ke kanan supaya
         layarnya jatuh di paruh kiri bingkai — paruh kanan tertutup panel.
         Tiap tingkat zoom memangkas jarak separuh, jadi tingkat 1 tampak 2x
         dan tingkat 2 tampak 4x; pada tingkat 2 pergeseran itu dinolkan
         karena panelnya ikut disurutkan. */
      const gsr=ZOOM_GSR[zoomLayar];
      posTuju.set(OFS6+gsr, 1.74, ZOOM_Z[zoomLayar]);
      lihatTuju.set(OFS6+gsr, 1.74, -3.3);
      posTuju.y += Math.sin(w*.22)*.012;
    }else{
      /* kamera berpaling ke papan area yang sedang dipelajari */
      const bx=[-2.6,0,2.6][pjTab];
      posTuju.x = OFS6 + bx*.35 + .9 + Math.sin(w*.07)*.12;
      lihatTuju.x = OFS6 + bx + 1.25;
      posTuju.y += Math.sin(w*.22)*.015;
    }
  }else if(layar==='pengakhiran'||layar==='hasil'){
    posTuju.x += Math.sin(w*.07)*.15;
    posTuju.y += Math.sin(w*.22)*.016;
    lihatTuju.x += Math.sin(w*.07)*.05;
  }
  /* geser halus mengikuti tetikus */
  posTuju.x+=parallax.x*.24;
  posTuju.y-=parallax.y*.13;
  lihatTuju.x+=parallax.x*.2;
  lihatTuju.y-=parallax.y*.12;

  const k=1-Math.exp(-dt*(layar==='buka'?1.35:1.9));
  posKini.lerp(posTuju,k);
  lihatKini.lerp(lihatTuju,k);
  camera.position.copy(posKini);
  camera.lookAt(lihatKini);
  if(Math.abs(camera.fov-fovTuju)>.01){
    camera.fov+=(fovTuju-camera.fov)*Math.min(1,dt*2.2);
    camera.updateProjectionMatrix();
  }
}

/* ---------- 8. SUARA ---------- */
const Suara=(()=>{
  const bgm=document.getElementById('bgm');
  let ctx=null, nyala=true, gagal=false;
  function init(){ if(!ctx){ try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
    if(ctx&&ctx.state==='suspended') ctx.resume().catch(()=>{}); }
  function nada(f,lama,tipe='sine',vol=.16){
    init(); if(!ctx||!nyala) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=tipe; o.frequency.value=f;
    g.gain.setValueAtTime(0,ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol,ctx.currentTime+.012);
    g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+lama);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime+lama+.02);
  }
  const sfx={
    klik:()=>{ nada(880,.16,'sine',.1); setTimeout(()=>nada(1320,.22,'sine',.06),40); },
    buka:()=>{ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>nada(f,.5,'sine',.08),i*85)); },
    tutup:()=>nada(392,.2,'sine',.08)
  };
  function mulaiBgm(){
    if(gagal||!nyala) return;
    bgm.volume=.42; bgm.loop=true;
    bgm.addEventListener('error',()=>gagal=true,{once:true});
    if(bgm.paused) bgm.play().catch(err=>{
      /* NotAllowedError hanya berarti peramban menunggu interaksi pengguna */
      if(!err || err.name!=='NotAllowedError') gagal=true;
    });
  }
  return {sfx, mulaiBgm, init,
    aktif:()=>!!(bgm && !bgm.paused),
    setNyala:v=>{ nyala=v; if(!v) bgm.pause(); else mulaiBgm(); },
    nyala:()=>nyala};
})();

/* musik dicoba dinyalakan sejak awal; bila diblokir, menyala pada
   interaksi pertama — termasuk sekadar menggerakkan tetikus */
const PEMICU=['pointerdown','pointermove','keydown','touchstart','wheel'];
function nyalakanMusik(){
  Suara.init(); Suara.mulaiBgm();
  if(Suara.aktif()){
    PEMICU.forEach(e=>removeEventListener(e,nyalakanMusik));
    const h=document.getElementById('isyarat');
    if(h) h.textContent='🎵 Musik ruangan sedang diputar';
  }
}
PEMICU.forEach(e=>addEventListener(e,nyalakanMusik,{passive:true}));
nyalakanMusik(); setTimeout(nyalakanMusik,600);

/* ---------- 9. ANTARMUKA ---------- */
const elMuat=document.getElementById('muat'), elMuatBar=document.getElementById('muatBar');
const elTirai=document.getElementById('tirai'), elPembuka=document.getElementById('pembuka');
const elBar=document.getElementById('bar'), elJudul=document.getElementById('judulKecil');
const elPandu=document.getElementById('pandu'), elPanel=document.getElementById('panel');

const elPengantar=document.getElementById('pengantarUI');
const elMateri=document.getElementById('materiUI');
const elSiap=document.getElementById('siapUI');
const elTutup=document.getElementById('tutupUI');
const elHasil=document.getElementById('hasilUI');
const elTes=document.getElementById('tesUI');
const elTesLayar=document.getElementById('tesLayar');
const elPijat=document.getElementById('pijatUI');

/* Menu yang punya properti `ruang` memindahkan pengguna ke ruangan lain,
   bukan sekadar menampilkan panel keterangan. */
function masukRuang(nama){
  Suara.sfx.buka();
  elPanel.classList.remove('tampil');
  elTirai.style.transition='opacity .42s ease'; elTirai.style.opacity='1';
  setTimeout(()=>{
    keLayar(nama,true);
    wadahHotspot.classList.remove('hidup');
    elBar.classList.remove('tampil'); elPandu.classList.remove('tampil');
    if(sorotKini>=0){ sorot(sorotKini,false); sorotKini=-1; }
    renderer.domElement.style.cursor='';
    document.body.classList.add('di-ruang');
    if(nama==='pengantar') elPengantar.classList.add('tampil');
    if(nama==='materi'){ zoomLayar=0; perbaruiTingkatZoom(); pjBersihkanTayangan(); mtRender(); elMateri.classList.add('tampil'); }
    if(nama==='persiapan'){ mulaiPersiapan(); elSiap.classList.add('tampil'); }
    if(nama==='pengakhiran'){ tpTab=0; tpRender(); elTutup.classList.add('tampil'); }
    if(nama==='tes'){ tsMulai(); tsRender(); elTes.classList.add('tampil'); }
    if(nama==='hasil'){ hsRender(); elHasil.classList.add('tampil'); }
    if(nama==='massage'){ zoomLayar=0; perbaruiTingkatZoom(); pjBersihkanTayangan(); pjRender(); elPijat.classList.add('tampil'); }
    if(nama==='pengantar' && !maju.pengantar){ maju.pengantar=true; simpanMaju(); }
    elTirai.style.transition='opacity 1s ease'; elTirai.style.opacity='0';
  },440);
}
function kembaliKeSpa(){
  Suara.sfx.tutup();
  pjTutupTayangan();
  document.body.classList.remove('di-ruang');
  document.getElementById('mZoom').classList.remove('tampil');
  document.getElementById('spPesan').classList.remove('tampil');
  elPengantar.classList.remove('tampil');
  elMateri.classList.remove('tampil');
  elSiap.classList.remove('tampil');
  elTutup.classList.remove('tampil');
  elHasil.classList.remove('tampil');
  elTes.classList.remove('tampil');
  elTesLayar.classList.remove('tampil');
  elPijat.classList.remove('tampil');
  elTirai.style.transition='opacity .42s ease'; elTirai.style.opacity='1';
  setTimeout(()=>{
    keLayar('menu',true);
    perbaruiKunciMenu();          /* menu berikutnya mungkin baru saja terbuka */
    wadahHotspot.classList.add('hidup');
    elBar.classList.add('tampil'); elPandu.classList.add('tampil');
    elTirai.style.transition='opacity 1s ease'; elTirai.style.opacity='0';
  },440);
}
document.getElementById('btnPjKembali').onclick=kembaliKeSpa;
document.getElementById('btnMtKembali').onclick=kembaliKeSpa;
document.getElementById('btnSpKembali').onclick=kembaliKeSpa;
document.getElementById('btnTpKembali').onclick=kembaliKeSpa;
document.getElementById('btnTsKembali').onclick=kembaliKeSpa;
document.getElementById('btnHsKembali').onclick=kembaliKeSpa;
document.getElementById('btnPjPijatKembali').onclick=kembaliKeSpa;
addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  const z=document.getElementById('mZoom');
  if(z.classList.contains('tampil')){ z.classList.remove('tampil'); return; }
  if(layar!=='menu'&&layar!=='buka'&&layar!=='muat') kembaliKeSpa();
});

/* daftar tahap pada kartu Alur Modul */
document.getElementById('pjAlur').innerHTML=
  ['Pembuka','Pengantar','Anatomi & Fisiologi Dasar','Teknik Dasar Massage',
   'Persiapan Diri Terapis','Persiapan Alat & Bahan','Penerimaan & Anamnesis Klien',
   'Kuis Pos 1','Massage Kaki','Massage Punggung','Massage Lengan & Dada',
   'Pengakhiran & After Care','Tes Pengetahuan','Hasil']
  .map((t,i)=>`<span>${i+1}. ${t}</span>`).join('');

/* ---------- ISI RUANG MATERI ----------
   Teksnya disalin dari versi non-3D (app-anfis-spa) supaya kedua aplikasi
   selalu mengajarkan hal yang sama. Gambar dimuat sebagai <img> HTML, bukan
   tekstur WebGL, agar tetap tampil ketika halaman dibuka lewat file://. */
const MATERI=[
 {id:'kulit', ik:'🧴', gbr:'kulit', n:'Kulit', sub:'Sistem integumen', bagian:[
   {j:'Tentang Kulit', g:'assets/materi/diagram_kulit.png',
    t:'Kulit menutupi seluruh permukaan tubuh manusia. Luas kulit orang dewasa sekitar 1,5–2 m² dengan berat sekitar 15–16% dari berat badan. Pemahaman struktur kulit penting karena semua tindakan facial, body treatment, massage, peeling, maupun kosmetik berhubungan langsung dengan kondisi kulit.'},
   {j:'Fungsi Kulit', g:'assets/materi/fungsi_kulit.jpg',
    t:'<b>1. Melindungi tubuh</b> dari benturan, gesekan, bakteri, virus, bahan kimia, dan sinar UV matahari.<br><b>2. Mengatur suhu tubuh</b> melalui kelenjar keringat dan pembuluh darah.<br><b>3. Indra peraba</b> — reseptor sensorik menerima rangsangan sentuhan, tekanan, panas, dingin, dan rasa sakit.<br><b>4. Mengeluarkan zat sisa</b> metabolisme dan racun melalui keringat.<br><b>5. Memproduksi vitamin D</b> ketika terkena sinar matahari.<br><b>6. Menyimpan zat</b> — cadangan lemak, air, dan nutrisi.<br><b>7. Membantu penyembuhan</b> jaringan yang rusak seperti luka, goresan, atau lecet.<br><b>8. Menunjang penampilan</b> serta rasa percaya diri.<br><b>9. Menjaga keseimbangan cairan tubuh</b> dengan mencegah penguapan berlebihan.'},
   {j:'Epidermis (Kulit Ari)',
    t:'Lapisan kulit paling luar yang tidak memiliki pembuluh darah. Ketebalan epidermis berbeda-beda pada setiap bagian tubuh — misalnya telapak tangan lebih tebal, kelopak mata lebih tipis.'},
   {j:'Dermis',
    t:'Memberikan nutrisi pada epidermis, menjaga elastisitas kulit, mengatur suhu tubuh, menjadi tempat tumbuh rambut, serta menghasilkan minyak alami (sebum) dan keringat.'},
   {j:'Hipodermis (Subkutis)',
    t:'Lapisan paling bawah kulit, terdiri dari jaringan lemak dan jaringan ikat — berfungsi sebagai bantalan dan cadangan energi tubuh.'}
 ]},
 {id:'rambut', ik:'💇', gbr:'rambut', n:'Rambut', sub:'Pelengkap kulit', bagian:[
   {j:'Struktur Rambut', g:'assets/materi/image6.jpg',
    t:'Rambut adalah bagian pelengkap kulit (<i>appendages of the skin</i>) yang tersusun terutama dari protein keratin. Rambut tumbuh dari folikel rambut yang berada di lapisan dermis dan berfungsi melindungi kulit kepala, membantu menjaga suhu tubuh, serta menunjang penampilan.'},
   {j:'Penerapan dalam Kecantikan &amp; SPA',
    t:'Pemahaman struktur dan fungsi rambut menjadi dasar dalam melakukan berbagai layanan seperti <b>hair spa, creambath, hair treatment, hair coloring, smoothing, rebonding, curling</b>, dan pemotongan rambut.'}
 ]},
 {id:'otot', ik:'💪', gbr:'tubuh_dan_otot', n:'Tubuh &amp; Otot', sub:'Sistem otot', bagian:[
   {j:'Pengantar Otot', g:'assets/materi/otot_gambar.jpg',
    t:'Otot adalah jaringan tubuh yang memiliki kemampuan untuk berkontraksi dan berelaksasi, sehingga menghasilkan gerakan. Dalam bidang kecantikan dan spa, pengetahuan tentang otot penting karena berbagai perawatan melibatkan area yang memiliki jaringan otot — facial treatment, massage tubuh, perawatan leher, perawatan bahu dan punggung, body treatment, dan teknik relaksasi.'},
   {j:'Jenis Otot', g:'assets/materi/otot_jenis.jpg',
    t:'<b>Otot rangka</b> menempel pada tulang, bekerja secara sadar, dan menjadi sasaran utama pemijatan. <b>Otot jantung</b> hanya ada pada dinding jantung dan bekerja tanpa disadari. <b>Otot polos</b> menyusun dinding organ dalam seperti saluran pencernaan dan pembuluh darah, juga bekerja tanpa disadari.'},
   {j:'Fungsi Otot',
    t:'<b>Menghasilkan gerakan</b> — kontraksi otot menggerakkan tangan, kaki, kepala, dan wajah.<br><b>Mempertahankan postur tubuh</b> saat berdiri maupun duduk.<br><b>Menstabilkan persendian</b> ketika tubuh bergerak.<br><b>Menghasilkan panas</b> yang membantu menjaga suhu tubuh.<br><b>Membentuk kontur tubuh.</b><br><b>Menghasilkan ekspresi wajah</b> seperti tersenyum, mengerutkan dahi, mengedipkan mata, dan menggerakkan bibir.'},
   {j:'Otot Lengan &amp; Punggung', g:'assets/materi/otot_nama.jpg',
    t:'Area lengan dan punggung adalah wilayah kerja utama massage badan. Pada lengan terdapat deltoid, bicep, tricep, dan kelompok flexor; pada punggung terdapat trapezius, latisimus dorsi, otot di sisi vertebrae, serta titik sacrum. Mengenali letaknya membuat pemijatan tepat sasaran dan aman.'},
   {j:'Penerapan pada Massage', g:'assets/materi/otot_penerapan.jpg',
    t:'Pengetahuan otot menentukan arah, tekanan, dan durasi pemijatan. Gerakan mengikuti arah serat otot dan aliran darah balik menuju jantung, tekanan disesuaikan dengan ketebalan otot, serta area bertulang menonjol dihindari agar perawatan terasa nyaman dan bebas cedera.'}
 ]}
];
/* Ilustrasi label dari assets/icons/. Dimuat sebagai <img> HTML (bukan
   tekstur WebGL) supaya tetap tampil ketika dibuka lewat file://. */
const ikonTab=(gbr,emoji)=> gbr
  ? `<img class="ikon" src="assets/icons/${gbr}.png" alt="">`
  : `<i>${emoji}</i>`;

let materiAktif=0;
function mtRender(){
  document.getElementById('mtTab').innerHTML=MATERI.map((m,i)=>
    `<button data-mt="${i}" class="${i===materiAktif?'aktif':''}">
       ${ikonTab(m.gbr,m.ik)}${m.n}<span>${m.sub}</span></button>`).join('');
  document.querySelectorAll('#mtTab [data-mt]').forEach(b=>
    b.onclick=()=>mtPilih(+b.dataset.mt));
  const M=MATERI[materiAktif];
  document.getElementById('mtIsi').innerHTML=M.bagian.map(b=>
    `<div class="pjKartu"><h5>${b.j}</h5>${b.g
       ? `<img src="${b.g}" alt="${b.j}" data-tayang="${b.j}">
          <div class="zoomKet">📺 ketuk gambar untuk menayangkannya di layar tengah,
               lalu ketuk layarnya untuk memperbesar 2×</div>`
       : ''}<p>${b.t}</p></div>`).join('');
  document.getElementById('mtIsi').scrollTop=0;
  if(!maju.materi[M.id]){ maju.materi[M.id]=true; simpanMaju(); }
  /* papan topik terpilih disorot lebih terang di dalam ruangan */
  mtSorotLayar();
}

/* Layar topik terpilih menyala lebih terang; lampu dayanya ikut berganti.
   Dipisah dari mtRender() agar bisa dipanggil saat tayangan berubah tanpa
   menyusun ulang panel — menyusun ulang akan menggulung isinya ke atas. */
function mtSorotLayar(){
  papanMateri.forEach((p,i)=>{
    const aktif = i===materiAktif || (i===1 && tayangAktif);
    p.layar.material.emissiveIntensity = aktif ? 1.05 : .42;
    p.led.material.color.setHex(aktif ? 0x8dffc4 : 0x3a6b52);
  });
}
function mtPilih(i){ if(i===materiAktif) return;
  Suara.sfx.klik(); materiAktif=i; pjBersihkanTayangan(); mtRender(); }

/* pembesar gambar materi */
document.addEventListener('click',e=>{
  const t=e.target.closest('img[data-tayang]');
  if(t){ pjTayangkan(t.src, t.dataset.tayang); return; }
  const g=e.target.closest('img[data-zoom]');
  if(!g) return;
  Suara.sfx.klik();
  document.getElementById('mZoomFoto').src=g.src;
  document.getElementById('mZoom').classList.add('tampil');
});

/* Ketuk layar tengah di ruang prosedur massage untuk mendekat 2x,
   ketuk sekali lagi untuk kembali ke jarak normal. */
const rayLayar=new T.Raycaster();
renderer.domElement.addEventListener('click',()=>{
  const u=monitorRuang(layar);
  if(!u) return;
  const semua=(layar==='massage'?papanMassage:papanMateri).map(x=>x.layar);
  rayLayar.setFromCamera(tetikus,camera);
  const kena=rayLayar.intersectObjects(semua,false);
  if(kena.length && kena[0].object===u.layar) putarZoom();
});
document.getElementById('mZoom').onclick=function(){ Suara.sfx.tutup(); this.classList.remove('tampil'); };

/* ---------- ISI RUANG PERSIAPAN ----------
   Data langkah SOP, daftar alat, dan naskah anamnesis disalin apa adanya dari
   versi non-3D (app-anfis-spa) agar kedua aplikasi menilai hal yang sama. */
const APD=[
 {ik:'💍',n:'Melepas seluruh perhiasan',d:'Cincin, gelang, dan jam tangan dilepas paling awal agar tidak menggores kulit klien dan tidak menjadi tempat berkumpulnya kuman.'},
 {ik:'💇',n:'Merapikan dan mengikat rambut',d:'Rambut diikat rapi supaya tidak jatuh mengenai tubuh klien maupun mengganggu pandangan terapis saat bekerja.'},
 {ik:'✂️',n:'Memotong dan merapikan kuku',d:'Kuku yang pendek dan halus mencegah goresan pada kulit klien ketika melakukan petrissage maupun friction.'},
 {ik:'👚',n:'Mengenakan seragam kerja yang bersih',d:'Seragam bersih, tertutup, dan tidak berbau menjaga higiene sekaligus menampilkan profesionalitas terapis.'},
 {ik:'🧼',n:'Mencuci tangan dengan sabun',d:'Cuci tangan enam langkah minimal 20 detik dilakukan setelah diri rapi, tepat sebelum menyentuh klien, untuk memutus rantai penularan kuman.'},
 {ik:'🤲',n:'Mengeringkan dan menghangatkan telapak tangan',d:'Tangan yang kering dan hangat membuat sentuhan pertama terasa nyaman, bukan mengejutkan bagi klien.'}
];

const ALAT=[
 {id:'bed',n:'Massage Bed',foto:'assets/alat/icons/bed.png',ik:'🛏️',benar:true,d:'Massage bed adalah alat untuk berbaring pelanggan melakukan massage. Pastikan aman dan nyaman untuk perawatan.'},
 {id:'trolly',n:'Trolly',ik:'🧺',benar:true,d:'Trolly adalah tempat untuk menata kosmetik dan alat dalam perawatan, mempermudah terapis bekerja.'},
 {id:'selimut',n:'Selimut',foto:'assets/alat/icons/selimut.png',ik:'🧣',benar:true,d:'Selimut digunakan untuk menutup tubuh pelanggan ketika melakukan massage.'},
 {id:'kemben',n:'Kemben/Kamisol',foto:'assets/alat/icons/kemben.png',ik:'👗',benar:true,d:'Kemben merupakan lenan yang digunakan sebagai pengganti pakaian saat melakukan massage.'},
 {id:'kimono',n:'Kimono',foto:'assets/alat/icons/kimono.png',ik:'🥋',benar:true,d:'Kimono digunakan untuk menutup badan pelanggan saat berpindah dari ruang ganti menuju ruang perawatan.'},
 {id:'bando',n:'Hair Bando',foto:'assets/alat/icons/hair_bando.png',ik:'🎀',benar:true,d:'Hair band digunakan untuk menahan rambut agar tidak menutupi wajah ketika perawatan.'},
 {id:'panties',n:'Disposable Panties',ik:'🩲',benar:true,d:'Disposable panties digunakan sebagai pengganti celana dalam pada saat perawatan.'},
 {id:'bantal',n:'Bantal Kepala',foto:'assets/alat/icons/bantal.png',ik:'🛌',benar:true,d:'Bantal kepala memberikan dukungan dan kenyamanan pada kepala dan leher saat massage.'},
 {id:'mata',n:'Penutup Mata',foto:'assets/alat/icons/penutupmata.png',ik:'😴',benar:true,d:'Penutup mata melindungi mata dari cahaya ruangan sehingga memberi efek nyaman kepada pelanggan.'},
 {id:'handuk',n:'Handuk Mandi',foto:'assets/alat/icons/handuk.png',ik:'🧻',benar:true,d:'Handuk mandi berbahan lembut untuk mengeringkan tubuh setelah mandi dan massage.'},
 {id:'oil',n:'Massage Oil',foto:'assets/alat/icons/oil.png',ik:'🧴',benar:true,d:'Massage oil membantu mengurangi gesekan antara tangan dan kulit, memberi aroma relaksasi dan menutrisi kulit.'},
 {id:'cleanser',n:'Cream Cleanser',ik:'🧼',benar:false,d:'Cream cleanser digunakan untuk membersihkan wajah — bukan bagian dari alat dasar teknik massage.'},
 {id:'ember',n:'Ember Besar',ik:'🪣',benar:false,d:'Ember besar bukan termasuk alat pada penerapan teknik dasar massage.'}
];

const KLIEN=[
 {t:'Riwayat penyakit?',j:'Saya punya darah tinggi ringan, terkontrol dengan obat dari dokter. Terakhir kontrol tekanannya 130/85.'},
 {t:'Alergi minyak atau aroma?',j:'Tidak ada alergi. Saya justru suka aroma lavender.'},
 {t:'Sedang hamil atau menstruasi?',j:'Tidak sedang hamil, dan menstruasi saya baru selesai minggu lalu.'},
 {t:'Ada luka, memar, atau bengkak?',j:'Ada memar kecil di betis kiri karena terbentur kursi tiga hari yang lalu.'},
 {t:'Sedang mengonsumsi obat tertentu?',j:'Hanya obat darah tinggi. Saya tidak memakai obat pengencer darah.'},
 {t:'Kapan terakhir makan?',j:'Sekitar satu jam yang lalu, porsinya ringan saja.'}
];

const PUTUSAN=[
 {t:'Perawatan dilanjutkan dengan penyesuaian: hindari area memar di betis kiri, gunakan tekanan ringan sampai sedang, dan posisi kepala sedikit lebih tinggi.',
  benar:true,
  e:'Tepat. Memar adalah kontraindikasi lokal — cukup area itu yang dihindari. Hipertensi terkontrol masih boleh dipijat dengan tekanan ringan-sedang, dan makan satu jam lalu sudah aman untuk memulai perawatan.'},
 {t:'Perawatan dilanjutkan penuh dengan tekanan kuat di seluruh area agar pegalnya cepat hilang.',
  benar:false,
  e:'Belum tepat. Tekanan kuat pada klien dengan hipertensi berisiko menaikkan tekanan darah, dan memijat area memar akan memperparah perdarahan di bawah kulit.'},
 {t:'Perawatan dibatalkan seluruhnya karena klien memiliki riwayat darah tinggi.',
  benar:false,
  e:'Belum tepat. Hipertensi yang terkontrol bukan kontraindikasi mutlak. Membatalkan seluruh perawatan justru merugikan klien yang sebenarnya masih bisa dilayani dengan penyesuaian.'}
];

function acakArray(a){ const b=[...a];
  for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
  return b; }

const ALAT_BENAR = ALAT.filter(a=>a.benar).length;

/* Rak diisi di sini, bukan saat ruangan dibangun: larik ALAT baru
   dideklarasikan setelah pembangun ruangan dijalankan. */
function isiRakAlat(){
  const B=grupRakAlat;
  if(!B) return;
  /* Seluruh alat berjajar di rak — termasuk dua pengecoh. Yang sudah diambil
     ke trolly disembunyikan dari rak, sehingga isi rak selalu mencerminkan
     apa yang belum diambil. */
  const perBaris=[5,5,3];
  let ke=0;
  ALAT.forEach(a=>{
    let baris=0, sisa=ke;
    while(sisa>=perBaris[baris]){ sisa-=perBaris[baris]; baris++; }
    const n=perBaris[baris];
    const x=-1.05+sisa*(2.1/Math.max(1,n-1));
    ke++;
    const t=.28;
    const pl=new T.Mesh(new T.PlaneGeometry(t,t),
      new T.MeshStandardMaterial({transparent:true,alphaTest:.35,roughness:.85,
        metalness:0,side:T.DoubleSide,emissive:0xffffff,emissiveIntensity:.18}));
    pl.position.set(x, 1.05+baris*.47+t/2+.02, -.3);
    pl.rotation.y=acak(-.07,.07); pl.castShadow=true; B.add(pl);
    rakAlat[a.id]=pl;
    const sumber = IKON_ALAT[a.id] && window.ALAT_GBR && window.ALAT_GBR[IKON_ALAT[a.id]];
    if(sumber){
      new T.TextureLoader().load(sumber, peta=>{
        peta.colorSpace=T.SRGBColorSpace; peta.anisotropy=8;
        pl.material.map=peta; pl.material.emissiveMap=peta; pl.material.needsUpdate=true;
      });
    }else{
      const peta=tekstur(kartuAlat(a.ik),1,1);
      pl.material.map=peta; pl.material.emissiveMap=peta; pl.material.needsUpdate=true;
    }
  });
}
const spSelesai = {diri:false, alat:false, klien:false};
let spTab=0, apdPakai={}, alatDiambil={}, klienTanyaN=0, alatAcak=null;
const apdJml=()=>Object.keys(apdPakai).length;

function spPesan(judul,isi,buruk){
  const el=document.getElementById('spPesan');
  el.className='tampil'+(buruk?' buruk':'');
  el.innerHTML=`<b>${judul}</b>${isi}`;
  clearTimeout(spPesan._t);
  spPesan._t=setTimeout(()=>el.classList.remove('tampil'),4200);
}
function spTabRender(){
  const t=[{ik:'🧤',n:'Persiapan Diri',s:`${apdJml()}/${APD.length} langkah`,k:'diri'},
           {ik:'🧺',n:'Alat & Bahan',  s:`${Object.keys(alatDiambil).length}/${ALAT_BENAR} alat`,k:'alat'},
           {ik:'📋',n:'Terima Klien',  s:`${klienTanyaN}/${KLIEN.length} tanya`,k:'klien'}];
  document.getElementById('spTab').innerHTML=t.map((x,i)=>
    `<button data-sp="${i}" class="${i===spTab?'aktif':''}">
       <i>${x.ik}</i>${x.n}<span>${x.s}</span>
       ${spSelesai[x.k]?'<span class="cek">✓</span>':''}</button>`).join('');
  document.querySelectorAll('#spTab [data-sp]').forEach(b=>
    b.onclick=()=>{ const i=+b.dataset.sp; if(i===spTab)return; Suara.sfx.klik(); spTab=i; spRender(); });
}
function spRender(){
  spTabRender();
  const w=document.getElementById('spIsi');
  if(spTab===0) w.innerHTML=spDiriHTML();
  else if(spTab===1) w.innerHTML=spAlatHTML();
  else w.innerHTML=spKlienHTML();
  w.scrollTop=0;
  spPasangAksi();
}

/* --- stasiun 1: urutan persiapan diri --- */
let apdAcak=null;
function spDiriHTML(){
  if(!apdAcak) apdAcak=acakArray(APD.map((a,i)=>({a,i})));
  return `<div class="pjKartu"><h5>📑 Persiapan Diri (SOP)</h5>
    <p>Ketuk tiap kartu langkah untuk mengerjakannya — bebas mulai dari mana saja.
       Daftar di bawah memperlihatkan urutan SOP yang dianjurkan beserta langkah
       yang sudah kamu kerjakan.</p></div>
   <div class="pjKartu"><h5>Urutan SOP yang Dianjurkan</h5><div class="spSlot">` +
    APD.map((a,i)=>`<div class="s ${apdPakai[i]?'isi':''}"><span class="no">${i+1}</span>
      <span>${a.ik}  ${a.n}</span></div>`).join('') +
   `</div></div>
   <div class="pjKartu"><h5>Kartu Langkah (teracak)</h5><div class="spPilih">` +
    apdAcak.map(x=>`<button data-apd="${x.i}" class="${apdPakai[x.i]?'pakai':''}">
      <i>${x.a.ik}</i><span>${x.a.n}</span></button>`).join('') +
   `</div></div>`;
}
function klikApd(i,el){
  if(apdPakai[i]) return;                 /* sudah dikerjakan, abaikan */
  Suara.sfx.klik(); apdPakai[i]=true;
  spPesan('✔ '+APD[i].n, APD[i].d);
  if(apdJml()===APD.length){
    spSelesai.diri=true; maju.diri=true; simpanMaju(); Suara.sfx.buka();
    spPesan('🏅 Persiapan diri selesai','Terapis yang bersih, rapi, dan berkuku pendek membuat klien merasa aman serta nyaman selama perawatan.');
  }
  spRender();
}

/* --- stasiun 2: memilih alat & bahan --- */
function spAlatHTML(){
  if(!alatAcak) alatAcak=acakArray(ALAT);
  return `<div class="pjKartu"><h5>🧺 Alat &amp; Bahan Perawatan</h5>
    <p>Pilih alat dan bahan yang tepat, lalu letakkan pada trolly. Ada dua benda pengecoh —
       jangan ikut diambil. Terkumpul <b>${Object.keys(alatDiambil).length} dari ${ALAT_BENAR}</b>.</p></div>
   <div class="pjKartu"><div class="spGrid">` +
    alatAcak.map(a=>`<button data-alat="${a.id}" class="${alatDiambil[a.id]?'ambil':''}">
      <span class="gb">${a.foto?`<img src="${a.foto}" alt="${a.n}">`:a.ik}</span>${a.n}</button>`).join('') +
   `</div></div>`;
}
/* Alat yang punya ilustrasi sendiri; sisanya (trolly, disposable panties, dan
   kedua pengecoh) tetap memakai kartu beremoji lewat kartuAlat().
   Nilainya adalah kunci pada window.ALAT_GBR di lib/alat.js — perhatikan
   'bando' memakai berkas bernama hair_bando. */
const IKON_ALAT={bed:'bed', selimut:'selimut', kimono:'kimono', bantal:'bantal',
  mata:'penutupmata', handuk:'handuk', oil:'oil',
  bando:'hair_bando', kemben:'kemben'};
const WARNA_ALAT={bed:0xd8cdbb,trolly:0xdfe3e6,selimut:0xc9b39a,kemben:0xd9a6b8,kimono:0xe8dcc8,
  bando:0xd0a8b8,panties:0xf0e6da,bantal:0xf2ece2,mata:0x5b4f63,handuk:0xf6f1e8,oil:0xc98338};
function klikAlat(id,el){
  const a=ALAT.find(x=>x.id===id);
  if(!a.benar){
    Suara.sfx.tutup(); el.classList.add('salah'); setTimeout(()=>el.classList.remove('salah'),340);
    spPesan('✘ Bukan alat perawatan', a.d, true);
    return;
  }
  if(alatDiambil[id]) return;
  alatDiambil[id]=true; Suara.sfx.klik();
  taruhDiTrolly(WARNA_ALAT[id]||0xd8cdbb, id);
  spPesan('✔ '+a.n, a.d);
  if(Object.keys(alatDiambil).length===ALAT_BENAR){
    spSelesai.alat=true; maju.alat=true; simpanMaju(); Suara.sfx.buka();
    spPesan('🏅 Alat &amp; bahan lengkap','Seluruh alat dan bahan perawatan berhasil dikumpulkan ke trolly. Tahap berikutnya: menerima klien dan melakukan anamnesis.');
  }
  spRender();
}

/* --- stasiun 3: anamnesis klien --- */
let klienJawab=[], klienPutusan=-1;
function spKlienHTML(){
  return `<div class="pjKartu"><h5>🧕 Ny. Rani · 34 tahun</h5>
     <p>Guru SD — kunjungan pertama. Keluhan: pegal pada bahu dan betis setelah seharian
        berdiri mengajar. Menginginkan perawatan relaksasi tubuh.</p></div>
   <div class="pjKartu"><h5>🩺 Pertanyaan Anamnesis</h5>
     <p style="margin-bottom:8px">Ajukan seluruh pertanyaan, lalu tentukan kelayakan klien.</p>
     <div class="spChip">` +
     KLIEN.map((k,i)=>`<button data-klien="${i}" class="${klienJawab.includes(i)?'sudah':''}">${i+1}. ${k.t}</button>`).join('') +
   `</div>` +
     klienJawab.map(i=>`<div class="spBalon"><b>💬 ${KLIEN[i].t}</b><p>“${KLIEN[i].j}”</p></div>`).join('') +
   `</div>` +
   (klienTanyaN===KLIEN.length ? `<div class="pjKartu sorot"><h5>🩺 Keputusan Terapis</h5>
      <p>Seluruh data anamnesis sudah terkumpul. Apa keputusanmu untuk klien ini?</p>
      <div class="spOpsi">` +
      PUTUSAN.map((o,i)=>`<button data-putus="${i}" class="${klienPutusan===i?(o.benar?'benar':'keliru'):''} ${spSelesai.klien?'mati':''}">
        <b>${'ABC'[i]}.</b> ${o.t}</button>`).join('') +
     `</div></div>` : '');
}
function klikKlien(i,el){
  if(klienJawab.includes(i)) return;
  Suara.sfx.klik(); klienJawab.push(i); klienTanyaN=klienJawab.length;
  spRender();
  const w=document.getElementById('spIsi'); w.scrollTop=w.scrollHeight;
}
function klikPutusan(i,el){
  const o=PUTUSAN[i]; klienPutusan=i;
  if(!o.benar){
    Suara.sfx.tutup(); spPesan('✘ Keputusan belum tepat', o.e, true); spRender(); return;
  }
  spSelesai.klien=true; maju.klien=true; simpanMaju(); Suara.sfx.buka();
  spPesan('🏅 Anamnesis selesai', o.e);
  spRender();
}
function spPasangAksi(){
  const w=document.getElementById('spIsi');
  w.querySelectorAll('[data-apd]').forEach(b=>b.onclick=()=>klikApd(+b.dataset.apd,b));
  w.querySelectorAll('[data-alat]').forEach(b=>b.onclick=()=>klikAlat(b.dataset.alat,b));
  w.querySelectorAll('[data-klien]').forEach(b=>b.onclick=()=>klikKlien(+b.dataset.klien,b));
  w.querySelectorAll('[data-putus]').forEach(b=>b.onclick=()=>klikPutusan(+b.dataset.putus,b));
}
/* Latihan selalu dimulai dari nol setiap kali ruangan dibuka supaya bisa
   diulang berkali-kali. Capaian yang sudah tercatat di `maju` tidak dihapus —
   rekapnya tetap muncul di ruang penghargaan. */
function mulaiPersiapan(){
  spSelesai.diri=spSelesai.alat=spSelesai.klien=false;
  apdPakai={}; alatDiambil={}; klienJawab=[]; klienTanyaN=0; klienPutusan=-1;
  apdAcak=null; alatAcak=null;
  kosongkanTrolly();
  spTab=0; spRender();
}

/* ---------- KEMAJUAN BELAJAR ----------
   Delapan capaian yang dapat diselesaikan di aplikasi 3D ini. Disimpan di
   perangkat supaya layar Hasil tetap bermakna setelah halaman dimuat ulang.
   Menu 4 (Prosedur Massage) belum tersedia, jadi tidak ikut dinilai. */
const KUNCI3D='anfis3d_progress';
const MAJU_AWAL={pengantar:false, materi:{}, diri:false, alat:false, klien:false, massage:{}, tes:{}, after:{}};
let maju=Object.assign({},MAJU_AWAL,(()=>{ try{return JSON.parse(localStorage.getItem(KUNCI3D))||{};}catch(e){return {};} })());
['materi','massage','tes','after'].forEach(k=>{ if(!maju[k]||typeof maju[k]!=='object') maju[k]={}; });

function simpanMaju(){ try{ localStorage.setItem(KUNCI3D,JSON.stringify(maju)); }catch(e){} }

/* Kemajuan lama belum menyimpan `buka`. Daripada mengunci ulang pengguna yang
   sudah berjalan jauh, batasnya diturunkan dari menu yang sudah tuntas.
   DIPANGGIL DARI IIFE mulai() di akhir berkas, bukan di sini: menuTuntas(5)
   menyentuh afterTuntas() yang baru dideklarasikan di bawah. */
function migrasiBukaMenu(){
  /* Sengaja TANPA nilai bawaan di MAJU_AWAL: kalau `buka` diisi di sana,
     Object.assign membuatnya selalu ada dan pemeriksaan ini tidak pernah
     berjalan — pengguna dengan kemajuan lama akan terkunci ulang. */
  if(typeof maju.buka==='number') return;
  maju.buka=1;
  while(maju.buka<MENU.length && menuTuntas(maju.buka)) maju.buka++;
  simpanMaju();
}

const AFTER=[
 {ik:'🤲',n:'Akhiri dengan usapan penenang',d:'Tutup rangkaian pemijatan dengan effleurage ringan dan lambat agar otot benar-benar rileks dan klien tidak terkejut saat sentuhan berhenti.'},
 {ik:'🧖',n:'Bersihkan sisa minyak',d:'Seka tubuh klien memakai handuk hangat lembap untuk mengangkat sisa massage oil, lalu keringkan dengan handuk kering yang bersih.'},
 {ik:'🛏️',n:'Bantu klien bangun perlahan',d:'Beri tahu bahwa perawatan telah selesai, bantu klien miring lebih dulu lalu duduk perlahan untuk mencegah pusing akibat perubahan posisi mendadak.'},
 {ik:'🥛',n:'Sajikan air putih hangat',d:'Air hangat atau infused water membantu rehidrasi serta melancarkan pembuangan sisa metabolisme yang terlepas selama pemijatan.'},
 {ik:'📢',n:'Sampaikan saran after care',d:'Jelaskan apa yang perlu dilakukan dan dihindari klien di rumah, serta anjuran jadwal perawatan berikutnya sesuai kondisinya.'},
 {ik:'🧼',n:'Rapikan alat dan sanitasi ruangan',d:'Ganti seluruh lenan, bersihkan massage bed dengan disinfektan, tata ulang trolly, lalu cuci tangan sebelum menerima klien berikutnya.'}
];

let tpTab=0;

/* ---------- RUANG PENGAKHIRAN (menu 5) ---------- */
const AFTER_SARAN=[
 'Minum air putih hangat untuk membantu pembuangan sisa metabolisme.',
 'Hindari mandi air dingin dan aktivitas berat selama ±2 jam.',
 'Istirahat cukup agar pemulihan otot berlangsung maksimal.',
 'Pegal ringan dalam 1×24 jam adalah reaksi yang wajar.',
 'Ulangi perawatan 2–4 minggu sekali sesuai kebutuhan.'
];
const afterTuntas=()=>Object.keys(maju.after).length===AFTER.length;
function tpRender(){
  const n=Object.keys(maju.after).length;
  document.getElementById('tpTab').innerHTML=
    [{ik:'🧾',nm:'Langkah Pengakhiran',s:`${n}/${AFTER.length} dibaca`,usai:afterTuntas()},
     {ik:'💧',nm:'After Care & Sanitasi',s:'saran untuk klien',usai:false}]
    .map((x,i)=>`<button data-tp="${i}" class="${i===tpTab?'aktif':''}">
        <i>${x.ik}</i>${x.nm}<span>${x.s}</span>${x.usai?'<span class="cek">✓</span>':''}</button>`).join('');
  document.querySelectorAll('#tpTab [data-tp]').forEach(b=>
    b.onclick=()=>{ const i=+b.dataset.tp; if(i===tpTab)return; Suara.sfx.klik(); tpTab=i; tpRender(); });

  const w=document.getElementById('tpIsi');
  if(tpTab===0){
    w.innerHTML=`<div class="pjKartu"><h5>🧾 Langkah Pengakhiran Perawatan</h5>
      <p>Ketuk setiap langkah untuk membaca penjelasannya. Keenam langkah harus
         dibaca seluruhnya agar capaian ini dihitung.</p></div>` +
      AFTER.map((x,i)=>`<div class="pilarT ${maju.after[i]?'dibaca':''}" data-af="${i}">
        <h5>${x.ik} ${i+1}. ${x.n}<span class="cek">✔</span></h5><p>${x.d}</p></div>`).join('');
    w.querySelectorAll('[data-af]').forEach(b=>b.onclick=()=>bacaAfter(+b.dataset.af));
  }else{
    w.innerHTML=`<div class="pjKartu sorot"><h5>💧 Saran After Care</h5><ul>` +
      AFTER_SARAN.map(t=>`<li>${t}</li>`).join('') + `</ul></div>
      <div class="pjKartu"><h5>🧼 Sanitasi &amp; Higiene Ruangan</h5>
        <p>Ganti seluruh lenan setiap selesai satu klien, bersihkan massage bed dengan
           disinfektan, cuci tangan, lalu tata kembali trolly agar siap untuk klien berikutnya.</p></div>`;
  }
  w.scrollTop=0;
}
function bacaAfter(i){
  Suara.sfx.klik();
  if(!maju.after[i]){
    maju.after[i]=true; simpanMaju();
    if(afterTuntas()){
      Suara.sfx.buka();
      setTimeout(()=>spPesanUmum('🏅 Perawatan ditutup dengan baik',
        'Sesi massage yang ditutup rapi dan disertai saran after care membuat klien puas serta ingin kembali.'),450);
    }
  }
  tpRender();
}
/* pesan mengambang dipakai bersama ruang persiapan */
function spPesanUmum(judul,isi,buruk){ spPesan(judul,isi,buruk); }

/* ---------- RUANG HASIL (menu 6) ---------- */
function rekapCapaian(){
  return [
    {n:'Pengantar Modul',        ok:maju.pengantar,      ket:'ruang orientasi dikunjungi'},
    {n:'Materi: Kulit',          ok:!!maju.materi.kulit, ket:'topik dibuka'},
    {n:'Materi: Rambut',         ok:!!maju.materi.rambut,ket:'topik dibuka'},
    {n:'Materi: Tubuh & Otot',   ok:!!maju.materi.otot,  ket:'topik dibuka'},
    {n:'Persiapan Diri Terapis', ok:maju.diri,           ket:'6 langkah SOP'},
    {n:'Persiapan Alat & Bahan', ok:maju.alat,           ket:'11 alat pada trolly'},
    {n:'Anamnesis Klien',        ok:maju.klien,          ket:'6 tanya + keputusan'},
    {n:'Prosedur Massage',       ok:['kaki','punggung','lengan'].every(k=>maju.massage[k]),
                                                         ket:'tiga area tubuh dipelajari'},
    {n:'Tes Pengetahuan',        ok:['punggung','kaki','lengan'].every(k=>maju.tes[k]),
                                                         ket:'3 area dijodohkan benar'},
    {n:'Pengakhiran & After Care',ok:afterTuntas(),      ket:'6 langkah penutup'}
  ];
}
function hsRender(){
  const r=rekapCapaian();
  const tuntas=r.filter(x=>x.ok).length, total=r.length;
  const nilai=Math.round(tuntas/total*100);
  const mutu = nilai>=90?'Sangat Baik' : nilai>=75?'Baik' : nilai>=60?'Cukup' : 'Perlu Dilengkapi';
  const bintang=Math.max(1,Math.round(nilai/20));
  document.getElementById('hsIsi').innerHTML=
    `<div class="pjKartu sorot"><div class="hsNilai">
       <div class="n">${nilai}</div><div class="m">${mutu}</div>
       <div class="b">${'★'.repeat(bintang)}${'☆'.repeat(5-bintang)}</div>
       <div class="k">${tuntas} dari ${total} capaian tuntas${nilai===100?'<br>Selamat, seluruh ruang praktik sudah kamu selesaikan!':''}</div>
     </div></div>
     <div class="pjKartu"><h5>📋 Rincian Capaian</h5>` +
      r.map(x=>`<div class="hsBaris"><span>${x.n}<br>
        <span style="font-size:10px;color:#8d8073">${x.ket}</span></span>
        <span class="st ${x.ok?'ya':'no'}">${x.ok?'✔ TUNTAS':'BELUM'}</span></div>`).join('') +
     `</div>`;
  document.getElementById('hsIsi').scrollTop=0;
  /* layar rekap di ruangan dibangkitkan ulang mengikuti capaian terbaru */
  if(meshSertifikat) gantiTekstur(meshSertifikat, texSertifikat3D(nilai,mutu,tuntas,total));
}
document.getElementById('btnHsUlang').onclick=()=>{
  Suara.sfx.tutup();
  maju=JSON.parse(JSON.stringify(MAJU_AWAL)); simpanMaju();
  perbaruiKunciMenu();   /* menu 2-6 terkunci lagi karena MAJU_AWAL tanpa `buka` */
  spSelesai.diri=spSelesai.alat=spSelesai.klien=false;
  apdPakai={}; alatDiambil={}; klienJawab=[]; klienTanyaN=0; klienPutusan=-1;
  apdAcak=null; alatAcak=null; kosongkanTrolly();
  materiAktif=0; tpTab=0; pjTab=0;
  hsRender();
};

/* ---------- ISI RUANG PROSEDUR MASSAGE ----------
   Disalin dari versi non-3D. Untuk memperbarui isinya nanti, cukup ganti
   larik di bawah — MASSAGE (titik teknik), GALERI (nama area),
   (urutan praktiknya kini datang dari LANGKAH_KERJA, lihat di bawah). */
const MASSAGE=[
 {id:'kaki',judul:'💆 Massage Area Kaki',svg:'kaki',titik:[
   {id:'plantar',x:62,y:86,n:'Plantar Fascia',d:'Jaringan pada telapak kaki yang menopang lengkung kaki. Pijat dengan tekanan lembut memanjang dari tumit ke jari kaki untuk meredakan ketegangan.'},
   {id:'achilles',x:49,y:72,n:'Achilles',d:'Tendon besar di belakang pergelangan kaki yang menghubungkan otot betis ke tumit. Pijat perlahan dengan gerakan memutar untuk relaksasi.'},
   {id:'betis',x:44,y:55,n:'Betis (Gastrocnemius)',d:'Otot besar di bagian belakang tulang kering. Gunakan gerakan mengurut ke atas (effleurage) untuk melancarkan aliran darah.'},
   {id:'paha',x:44,y:22,n:'Paha (Hamstring Muscle Group)',d:'Kelompok otot di bagian belakang paha. Pijat dengan tekanan sedang mengikuti arah serat otot dari lutut menuju panggul.'}]},
 {id:'punggung',judul:'💆 Massage Area Punggung',svg:'punggung',titik:[
   {id:'trapezius',x:50,y:17,n:'Trapezius',d:'Otot besar berbentuk trapesium di bagian atas punggung dan leher. Pijat dengan tekanan lembut untuk meredakan ketegangan bahu.'},
   {id:'latisimus',x:31,y:46,n:'Latisimus Dorsi',d:'Otot lebar di sisi punggung tengah. Gunakan gerakan mengurut memanjang (effleurage) dari pinggang ke arah bahu.'},
   {id:'vertebrae',x:50,y:58,n:'Vertebrae',d:'Ruas tulang belakang di garis tengah punggung. Hindari tekanan langsung pada tulang — pijat di sisi kiri-kanan garis tulang belakang.'},
   {id:'sacrum',x:50,y:85,n:'Titik Sacrum',d:'Tulang segitiga di bagian bawah tulang belakang, dekat panggul. Berikan tekanan lembut memutar untuk meredakan nyeri pinggang bawah.'}]},
 {id:'lengan',judul:'💆 Massage Area Lengan &amp; Dada',svg:'lengan',titik:[
   {id:'clavicula',x:50,y:21,n:'Clavicula',d:'Tulang selangka yang menghubungkan lengan ke tubuh. Pijat lembut di area sekitarnya untuk relaksasi bahu.'},
   {id:'bicep',x:20,y:43,n:'Bicep',d:'Otot bagian depan lengan atas. Pijat dengan tekanan sedang dari siku menuju bahu.'},
   {id:'tricep',x:80,y:43,n:'Tricep',d:'Otot bagian belakang lengan atas. Gunakan gerakan mengurut untuk melancarkan sirkulasi darah.'},
   {id:'flexor',x:19,y:74,n:'Flexor',d:'Kelompok otot lengan bawah yang menekuk pergelangan tangan dan jari. Pijat lembut dari pergelangan menuju siku.'}]}
];

/* ---------- SOAL TES PENGETAHUAN (menu 5) ----------
   Mengikuti storyboard "PENILAIAN PENGETAHUAN" (anfis-5.jpeg).

   `slot` adalah posisi kolom jawaban dalam PERSEN terhadap lebar/tinggi
   gambar peta — sengaja diletakkan TEPAT DI ATAS label tercetak pada peta
   supaya label aslinya tertutup (kalau tidak, jawabannya terbaca) sekaligus
   menjadi kotak sasaran, persis seperti rancangan storyboard. Angkanya
   diukur langsung dari ketiga berkas PNG; bila petanya diganti, ukur ulang.

   `pengecoh` menambah nama yang tidak punya kotak, supaya menjodohkan
   benar-benar menguji dan bukan sekadar menghabiskan kartu. */
const TES=[
 {id:'punggung', nama:'Punggung', peta:'assets/materi/4/punggung.png', pw:700, ph:1050,
  pengecoh:['Deltoid'],
  /* Label SACRUM & VERTEBRA pada berkas peta ini pernah tertukar dan sudah
     diperbaiki langsung di gambarnya (arsip versi lama:
     _sumber-anfis-3d/assets_materi_4/punggung_label_tertukar.png). */
  slot:[{n:'Trapezius',        x:71.8, y:19.6, w:26.2, h:4.6},
        {n:'Latissimus Dorsi', x: 3.5, y:47.3, w:31.5, h:6.6},
        {n:'Vertebra',         x:74.8, y:59.8, w:23.1, h:4.4},
        {n:'Sacrum',           x:77.1, y:77.0, w:20.3, h:4.4}]},
 {id:'kaki', nama:'Kaki', peta:'assets/materi/4/kaki.png', pw:428, ph:760,
  pengecoh:['Semitendinosus','Semimembranosus'],
  slot:[{n:'Bicep Femoris',  x:60.0, y:12.9, w:13.8, h:3.6},
        {n:'Gastrocnemius',  x:62.4, y:44.4, w:12.9, h:3.6},
        {n:'Achilles',       x:61.9, y:66.4, w:18.0, h:3.6},
        {n:'Plantar Fascia', x:57.9, y:81.4, w:28.1, h:3.6}]},
 {id:'lengan', nama:'Lengan &amp; Dada', peta:'assets/materi/4/lengan_dan_dada.png', pw:760, ph:608,
  pengecoh:['Deltoid'],
  slot:[{n:'Clavicula', x:46.2, y:22.4, w:12.0, h:4.3},
        {n:'Bicep',     x:71.8, y:40.6, w:8.5,  h:4.3},
        {n:'Tricep',    x:80.7, y:54.6, w:8.9,  h:4.3},
        {n:'Flexor',    x:87.5, y:69.7, w:9.9,  h:4.3}]}
];

let tsTab=0;
let tsIsi={};      /* id area -> {indeks slot: nama yang sudah benar} */
let tsAcak={};     /* id area -> urutan kartu, diacak sekali per kunjungan */

/* Tes selalu dimulai dari nol tiap kali ruangan dibuka, sama seperti latihan
   di ruang persiapan — capaian yang tercatat di `maju` tidak dihapus. */
function tsMulai(){ tsTab=0; tsIsi={}; tsAcak={}; }

const tsAreaSelesai=a=>Object.keys(tsIsi[a.id]||{}).length===a.slot.length;

function tsRender(){
  const A=TES[tsTab];
  if(!tsIsi[A.id])  tsIsi[A.id]={};
  if(!tsAcak[A.id]) tsAcak[A.id]=acakArray(A.slot.map(s=>s.n).concat(A.pengecoh));
  const isi=tsIsi[A.id];

  document.getElementById('tsTab').innerHTML=TES.map((x,i)=>
    `<button data-ts="${i}" class="${i===tsTab?'aktif':''}">${x.nama}
       <span>${Object.keys(tsIsi[x.id]||{}).length}/${x.slot.length} benar</span>
       ${maju.tes[x.id]?'<span class="cek">✓</span>':''}</button>`).join('');
  document.querySelectorAll('#tsTab [data-ts]').forEach(b=>
    b.onclick=()=>{ const i=+b.dataset.ts; if(i===tsTab) return;
      Suara.sfx.klik(); tsTab=i; tsRender(); });

  const terpakai=new Set(Object.values(isi));

  /* PETA ADA DI LAYAR TV, bukan di panel: soalnya besar dan panelnya sempit,
     jadi menaruh keduanya di panel memaksa menggulung padahal peta dan kartu
     dipakai bersamaan saat menyeret. Panel hanya memuat petunjuk dan kartu. */
  elTesLayar.innerHTML=
    `<div class="bingkai" style="aspect-ratio:${A.pw}/${A.ph}">
       <img src="${A.peta}" alt="Peta otot area ${A.nama}" draggable="false">` +
       A.slot.map((sl,i)=>`<div class="slot ${isi[i]?'benar':''}" data-slot="${i}"
            style="left:${sl.x}%;top:${sl.y}%;width:${sl.w}%;height:${sl.h}%">
            <span>${isi[i]||''}</span></div>`).join('') +
    `</div>`;
  elTesLayar.classList.add('tampil');

  document.getElementById('tsIsi').innerHTML=
    `<div class="pjKartu"><h5>🧩 Jodohkan Nama Otot — Area ${A.nama}</h5>
       <p>Seret setiap kartu di bawah ke kotak yang tepat pada layar. Jawaban
          benar mendapat tanda centang, jawaban keliru mendapat tanda silang
          dan kartunya kembali ke sini.</p></div>
      <div class="pjKartu"><h5>Kartu Nama Otot</h5><div class="tsKartu">` +
        tsAcak[A.id].map(n=>`<button class="${terpakai.has(n)?'pakai':''}"
            data-nama="${n}" ${terpakai.has(n)?'disabled':''}>${n}</button>`).join('') +
     `</div></div>`;
  document.getElementById('tsIsi').scrollTop=0;
  tsPasangSeret();

  const benar=Object.keys(isi).length;
  if(layarTes) gantiTekstur(layarTes,
    texLayarTes(A.nama.replace('&amp;','&'), benar, A.slot.length));
  if(tsAreaSelesai(A) && !maju.tes[A.id]){
    maju.tes[A.id]=true; simpanMaju(); Suara.sfx.buka();
    spPesan('🏅 Area '+A.nama.replace('&amp;','&')+' tuntas',
            'Seluruh nama otot sudah diletakkan pada bagian tubuh yang tepat.');
  }
}

/* Seret-lepas memakai Pointer Events, BUKAN HTML5 drag-and-drop: yang
   terakhir itu tidak jalan di layar sentuh, padahal aplikasi ini dipakai di
   tablet. Kartu yang diseret digandakan menjadi "hantu" yang mengikuti jari;
   kartu aslinya tetap di tempat supaya tata letaknya tidak melompat. */
function tsPasangSeret(){
  const wadah=document.getElementById('tsIsi');
  const semuaSlot=()=>elTesLayar.querySelectorAll('.slot');
  wadah.querySelectorAll('.tsKartu button:not(.pakai)').forEach(btn=>{
    btn.onpointerdown=e=>{
      e.preventDefault();
      const nama=btn.dataset.nama;
      const hantu=document.createElement('div');
      hantu.className='tsHantu'; hantu.textContent=nama;
      document.body.appendChild(hantu);
      const sasaran=ev=>{
        const b=document.elementFromPoint(ev.clientX,ev.clientY);
        return b && b.closest ? b.closest('.slot') : null;
      };
      const geser=ev=>{
        hantu.style.left=ev.clientX+'px'; hantu.style.top=ev.clientY+'px';
        semuaSlot().forEach(s=>s.classList.remove('incar'));
        const t=sasaran(ev);
        if(t && !t.classList.contains('benar')) t.classList.add('incar');
      };
      const lepas=ev=>{
        window.removeEventListener('pointermove',geser);
        window.removeEventListener('pointerup',lepas);
        hantu.remove();
        semuaSlot().forEach(s=>s.classList.remove('incar'));
        const t=sasaran(ev);
        if(t) tsJatuhkan(+t.dataset.slot, nama, t);
      };
      window.addEventListener('pointermove',geser);
      window.addEventListener('pointerup',lepas);
      geser(e);
    };
  });
}

function tsJatuhkan(idx, nama, el){
  const A=TES[tsTab];
  if(tsIsi[A.id][idx]) return;                 /* kotak sudah terisi benar */
  if(A.slot[idx].n===nama){
    tsIsi[A.id][idx]=nama; Suara.sfx.klik(); tsRender();
  }else{
    Suara.sfx.tutup();
    el.classList.add('salah');
    setTimeout(()=>el.classList.remove('salah'),620);
  }
}

/* Nama tampil tiap area. Dahulu larik ini juga memasok pola nama berkas dan
   kiat untuk kartu "Galeri Teknik Nyata"; kartu itu sudah dihapus dan
   assets/pijat/ ikut dibuang, jadi tinggal namanya. */
const GALERI={
  kaki:{nama:'Kaki'},
  punggung:{nama:'Punggung'},
  lengan:{nama:'Lengan &amp; Dada'}
};




let pjTab=0;
const PJ_AREA=['kaki','punggung','lengan'];

/* ---------- VIDEO PERAGAAN PER AREA ----------
   Berkasnya ada di assets/materi/4/<folder>/. Judul dan penjelasan sengaja
   ditulis langsung di sini supaya mudah disunting manual; ubah teksnya di
   larik ini saja, sisanya mengikuti. Gambar sampul dibuat dari satu bingkai
   videonya dan disimpan bersebelahan dengannya di folder langkah/. */
/* ---------- LANGKAH KERJA PER AREA ----------
   Disalin dari dokumen "LANGKAH PIJAT.docx" — judul langkah dan kalimat
   keterangannya mengikuti dokumen itu apa adanya (termasuk gaya "User ..."),
   supaya isi aplikasi bisa diadu langsung dengan dokumen acuannya.
   Videonya diunduh dari tautan Google Drive/OneDrive di dokumen lalu
   ditranscode ke H.264+AAC 720p; berkas aslinya 1080p beraudio PCM (±108 MB
   per 17 detik) yang tidak semua peramban mau memutar.
   Langkah tanpa `f` memang tidak punya video di dokumen.
   CATATAN: dokumen hanya memuat gerakan KAKI, PUNGGUNG, dan LENGAN — belum
   ada rangkaian langkah untuk DADA, jadi tab ketiga memakai langkah lengan. */
const LANGKAH_KERJA={
  kaki:[
   {n:1, j:'Mengaplikasikan Massage Oil',
    f:'assets/materi/4/kaki/langkah/01_mengaplikasikan_massage_oil.mp4',
    s:'assets/materi/4/kaki/langkah/01_mengaplikasikan_massage_oil.jpg',
    d:'Mengoleskan massage oil menggunakan telapak tangan dari ujung telapak kaki menuju tumit lalu mengusap kebawah.'},
   {n:2, j:'Efllurage',
    f:'assets/materi/4/kaki/langkah/02_efllurage.mp4',
    s:'assets/materi/4/kaki/langkah/02_efllurage.jpg',
    d:'Gerakan mengusap menggunakan satu telapak tangan dan tangan lainnya menahan di bagian pergelangan kaki.'},
   {n:3, j:'Friction',
    f:'assets/materi/4/kaki/langkah/03_friction.mp4',
    s:'assets/materi/4/kaki/langkah/03_friction.jpg',
    d:'Gerakan memutar menggunakan ibu jari secara bersamaan dan sejajar.'},
   {n:4, j:'Efllurage',
    f:'assets/materi/4/kaki/langkah/04_efllurage.mp4',
    s:'assets/materi/4/kaki/langkah/04_efllurage.jpg',
    d:'Gerakan mengusap menggunakan satu telapak tangan dan tangan lainnya menahan di bagian pergelangan kaki.'},
   {n:5, j:'Efflurage pada Achilles',
    f:'assets/materi/4/kaki/langkah/05_efflurage_pada_achilles.mp4',
    s:'assets/materi/4/kaki/langkah/05_efflurage_pada_achilles.jpg',
    d:'Gerakan mengusap menggunakan satu telapak tangan dan satu tangan lainnya menahan bagian atas pergelangan kaki.'},
   {n:6, j:'Efflurage pada Achilles',
    f:'assets/materi/4/kaki/langkah/06_efflurage_pada_achilles.mp4',
    s:'assets/materi/4/kaki/langkah/06_efflurage_pada_achilles.jpg',
    d:'Gerakan mengusap menggunakan ibu jari secara bergantian.'},
   {n:7, j:'Petrisage pada Achilles',
    f:'assets/materi/4/kaki/langkah/07_petrisage_pada_achilles.mp4',
    s:'assets/materi/4/kaki/langkah/07_petrisage_pada_achilles.jpg',
    d:'Gerakan mencubit dengan kedua tangan secara bergantian.'},
   {n:8, j:'Efflurage pada Achilles',
    f:'assets/materi/4/kaki/langkah/08_efflurage_pada_achilles.mp4',
    s:'assets/materi/4/kaki/langkah/08_efflurage_pada_achilles.jpg',
    d:'Gerakan mengusap menggunakan satu telapak tangan dan satu tangan lainnya menahan bagian atas pergelangan kaki.'},
   {n:9, j:'Efflurage pada Betis',
    f:'assets/materi/4/kaki/langkah/09_efflurage_pada_betis.mp4',
    s:'assets/materi/4/kaki/langkah/09_efflurage_pada_betis.jpg',
    d:'Gerakan mengusap menggunakan telapak tangan ditumpuk pada betis.'},
   {n:10, j:'Friction padaBetis',
    f:'assets/materi/4/kaki/langkah/10_friction_padabetis.mp4',
    s:'assets/materi/4/kaki/langkah/10_friction_padabetis.jpg',
    d:'Gerakan memutar menggunakan kedua ibu jari secara bersamaan.'},
   {n:11, j:'Tapotage pada Betis',
    f:'assets/materi/4/kaki/langkah/11_tapotage_pada_betis.mp4',
    s:'assets/materi/4/kaki/langkah/11_tapotage_pada_betis.jpg',
    d:'Gerakan memukul (Hacking) menggunakan kedua sisi luar jari tangan secara bergantian.'},
   {n:12, j:'Efflurage pada Betis',
    f:'assets/materi/4/kaki/langkah/12_efflurage_pada_betis.mp4',
    s:'assets/materi/4/kaki/langkah/12_efflurage_pada_betis.jpg',
    d:'Gerakan mengusap menggunakan telapak tangan ditumpuk pada betis.'},
   {n:13, j:'Efflurage pada Paha',
    f:'assets/materi/4/kaki/langkah/13_efflurage_pada_paha.mp4',
    s:'assets/materi/4/kaki/langkah/13_efflurage_pada_paha.jpg',
    d:'Gerakan mengusap menggunakan kedua telapak tangan yang ditumpuk.'},
   {n:14, j:'Efflurage menggunakan ibu jari pada paha',
    f:'assets/materi/4/kaki/langkah/14_efflurage_menggunakan_ibu_jari_pad.mp4',
    s:'assets/materi/4/kaki/langkah/14_efflurage_menggunakan_ibu_jari_pad.jpg',
    d:'Gerakan mengusap menggunakan ibu jari dari bawah ke atas pada bagian Tengah, dalam dan luar paha.'},
   {n:15, j:'Friction pada Paha',
    f:'assets/materi/4/kaki/langkah/15_friction_pada_paha.mp4',
    s:'assets/materi/4/kaki/langkah/15_friction_pada_paha.jpg',
    d:'Gerakan memutar menggunakan ibu jari dari bawah ke atas pada paha.'},
   {n:16, j:'Tapotage pada Paha',
    f:'assets/materi/4/kaki/langkah/16_tapotage_pada_paha.mp4',
    s:'assets/materi/4/kaki/langkah/16_tapotage_pada_paha.jpg',
    d:'Gerakan tapotage yaitu menepuk menggunakan kedua sisi luar jari tangan secara bergantian.'},
   {n:17, j:'Efflurage pada Paha',
    f:'assets/materi/4/kaki/langkah/17_efflurage_pada_paha.mp4',
    s:'assets/materi/4/kaki/langkah/17_efflurage_pada_paha.jpg',
    d:'Gerakan mengusap menggunakan kedua telapak tangan yang ditumpuk.'},
  ],
  punggung:[
   {n:1, j:'Efflurage pada punggung',
    f:'assets/materi/4/punggung/langkah/01_efflurage_pada_punggung.mp4',
    s:'assets/materi/4/punggung/langkah/01_efflurage_pada_punggung.jpg',
    d:'Gerakan mengusap menggunakan kedua telapak tangan pada bagian kanan dan kiri vertebra.'},
   {n:2, j:'Friction pada punggung',
    f:'assets/materi/4/punggung/langkah/02_friction_pada_punggung.mp4',
    s:'assets/materi/4/punggung/langkah/02_friction_pada_punggung.jpg',
    d:'Gerakan melakukan gerakan memutar menggunakan telapak tangan pada bagian kanan dan kiri tulang vertebra.'},
   {n:3, j:'Tapotage pada punggung',
    f:'assets/materi/4/punggung/langkah/03_tapotage_pada_punggung.mp4',
    s:'assets/materi/4/punggung/langkah/03_tapotage_pada_punggung.jpg',
    d:'Gerakan menepuk menggunakan telapak tangan pada bagian samping kanan dan kiri secara bergantian.'},
   {n:4, j:'Petrisage pada Punggung',
    f:'assets/materi/4/punggung/langkah/04_petrisage_pada_punggung.mp4',
    s:'assets/materi/4/punggung/langkah/04_petrisage_pada_punggung.jpg',
    d:'Gerakan mencubit dengan ibu jari untuk mendorong otot dan menariknya dengan telunjuk dan jari ketiga.'},
   {n:5, j:'Efflurage pada punggung',
    f:'assets/materi/4/punggung/langkah/05_efflurage_pada_punggung.mp4',
    s:'assets/materi/4/punggung/langkah/05_efflurage_pada_punggung.jpg',
    d:'Gerakan mengusap menggunakan kedua telapak tangan pada bagian kanan dan kiri vertebra.'},
  ],
  lengan:[
   {n:1, j:'Efflurage pada Lengan',
    f:'assets/materi/4/lengan/langkah/01_efflurage_pada_lengan.mp4',
    s:'assets/materi/4/lengan/langkah/01_efflurage_pada_lengan.jpg',
    d:'Gerakan mengusap menggunakan kedua telapak tangan.'},
   {n:2, j:'Friction pada Lengan',
    f:'assets/materi/4/lengan/langkah/02_friction_pada_lengan.mp4',
    s:'assets/materi/4/lengan/langkah/02_friction_pada_lengan.jpg',
    d:'Gerakan memutar menggunakan ibu jari pada bagian legan bawah dan lengan atas.'},
   {n:3, j:'Tapotage pada lengan',
    f:'assets/materi/4/lengan/langkah/03_tapotage_pada_lengan.mp4',
    s:'assets/materi/4/lengan/langkah/03_tapotage_pada_lengan.jpg',
    d:'Gerakan tapotage dengan memukul menggunakan kepalan telapak tangan pada sisi luar dan dalam lengan.'},
   {n:4, j:'Petrisage pada Lengan',
    f:'assets/materi/4/lengan/langkah/04_petrisage_pada_lengan.mp4',
    s:'assets/materi/4/lengan/langkah/04_petrisage_pada_lengan.jpg',
    d:'Gerakan skinrolling yaitu Gerakan mencubit mencubit dengan ibu jari untuk mendorong otot dan menariknya dengan telunjuk dan jari ketiga, serta menggulung kulit ke dalam.'},
   {n:5, j:'Efflurage pada Lengan',
    f:'assets/materi/4/lengan/langkah/05_efflurage_pada_lengan.mp4',
    s:'assets/materi/4/lengan/langkah/05_efflurage_pada_lengan.jpg',
    d:'Gerakan mengusap menggunakan kedua telapak tangan.'},
   {n:6, j:'Vibration',
    f:'assets/materi/4/lengan/langkah/06_vibration.mp4',
    s:'assets/materi/4/lengan/langkah/06_vibration.jpg',
    d:'Gerakan Menggetar menggunakan telapak tangan secara bergantian.'},
  ],
};



let pjVideoAktif=null;      /* indeks video yang sedang diputar pada area ini */
const elTayangLayar=document.getElementById('tayangLayar');
const elGambarLayar=document.getElementById('gambarLayar');
const elVideoLayar =document.getElementById('videoLayar');

/* Isi layar saat video sedang menempel di atasnya — sengaja gelap polos
   supaya tepi elemen <video> menyatu bila proyeksinya meleset sepersekian
   piksel. */
function layarKosongGelap(judul){
  return kanvas(1024,576,(x,w,h)=>{
    x.fillStyle='#07060a'; x.fillRect(0,0,w,h);
    x.textAlign='center'; x.fillStyle='rgba(255,255,255,.3)';
    x.font='22px "Segoe UI",sans-serif';
    x.fillText(judul||'', w/2, h-22);
  });
}
function pjPutarVideo(i){
  const v=LANGKAH_KERJA[PJ_AREA[pjTab]][i];
  if(!v || !v.f) return;
  tayangAktif={src:v.f, judul:v.j};      /* agar kamera menghadap layar tengah */
  pjVideoAktif=i;
  const u=monitorRuang(layar);
  if(u) gantiTekstur(u.layar, layarKosongGelap(`${v.n}. ${v.j}`));
  elGambarLayar.classList.remove('main');
  elGambarLayar.removeAttribute('src');
  /* Sampulnya dipasang supaya layar langsung memperlihatkan isi videonya,
     bukan bidang hitam, selagi menunggu diketuk. */
  if(v.s) elVideoLayar.poster=v.s; else elVideoLayar.removeAttribute('poster');
  elVideoLayar.src=v.f;
  elVideoLayar.classList.add('main');
  elTayangLayar.classList.add('tampil');
  /* SENGAJA TIDAK langsung diputar: videonya menetap dulu di layar dengan
     lencana ▶, lalu ketukan pada layar yang memutarnya. Ketukan berikutnya
     baru mengatur zoom. */
  tandaiJeda();
  Suara.sfx.klik();
  pjRender();
}
/* Video TIDAK pernah diputar otomatis. Selain itu yang dikehendaki, cara ini
   juga kebal kebijakan autoplay Chrome yang menolak play() tanpa gestur
   pengguna — diuji langsung: play() dari peristiwa 'canplay' ditolak dengan
   NotAllowedError. Di sini play() selalu lahir dari ketukan pada layar.
   Video langkah tidak beraudio, jadi membisukan tidak menghilangkan apa pun
   bila itu yang menolongnya. */
function cobaPutar(){
  const q=elVideoLayar.play();
  if(q && q.catch) q.catch(()=>{
    elVideoLayar.muted=true;
    const lagi=elVideoLayar.play();
    if(lagi && lagi.catch) lagi.catch(()=>tandaiJeda());
  });
  tandaiJeda();
}
function tandaiJeda(){
  elTayangLayar.classList.toggle('jeda',
    pjVideoAktif!==null && elVideoLayar.paused);
}
elVideoLayar.addEventListener('play',  tandaiJeda);
elVideoLayar.addEventListener('pause', tandaiJeda);
elVideoLayar.addEventListener('canplay',tandaiJeda);

function pjHentikanVideo(){
  if(pjVideoAktif===null) return;
  pjVideoAktif=null;
  elVideoLayar.pause();
  elVideoLayar.removeAttribute('src');
  elVideoLayar.removeAttribute('poster');
  elVideoLayar.load();
  elVideoLayar.classList.remove('main');
  elTayangLayar.classList.remove('jeda');
}
/* Tutup wadah tayangan — dipakai bersama oleh gambar dan video. */
function pjTutupTayangan(){
  pjHentikanVideo();
  elGambarLayar.classList.remove('main');
  elGambarLayar.removeAttribute('src');
  elTayangLayar.classList.remove('tampil','dekat','penuh');
  document.body.classList.remove('zoomPenuh');
}
/* Elemen video ditempelkan pada layar 3D dengan memproyeksikan keempat sudut
   bidang layarnya ke koordinat layar tiap frame — jadi ia ikut membesar saat
   kamera mendekat, persis seperti gambar yang ditayangkan. */
const sudutLayar=[[-1,1],[1,1],[-1,-1],[1,-1]];
/* Tempelkan sebuah elemen HTML pada bidang layar 3D dengan memproyeksikan
   keempat sudutnya tiap frame. Dipakai dua kali: tayangan video/gambar di
   ruang materi & massage, dan peta soal di ruang tes. */
function tempelKeLayar(el, m){
  const g=m.geometry.parameters;
  camera.updateMatrixWorld();
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  sudutLayar.forEach(([sx,sy])=>{
    const w=m.localToWorld(new T.Vector3(sx*g.width/2, sy*g.height/2, 0)).project(camera);
    const px=(w.x*.5+.5)*innerWidth, py=(-w.y*.5+.5)*innerHeight;
    x0=Math.min(x0,px); x1=Math.max(x1,px); y0=Math.min(y0,py); y1=Math.max(y1,py);
  });
  const st=el.style;
  st.left=x0.toFixed(1)+'px'; st.top=y0.toFixed(1)+'px';
  st.width=(x1-x0).toFixed(1)+'px'; st.height=(y1-y0).toFixed(1)+'px';
}
function perbaruiTayangLayar(){
  const u=monitorRuang(layar);
  if(u && elTayangLayar.classList.contains('tampil')) tempelKeLayar(elTayangLayar, u.layar);
  if(layar==='tes' && layarTes && elTesLayar.classList.contains('tampil'))
    tempelKeLayar(elTesLayar, layarTes);
}
/* Normal -> 2x -> 4x -> normal. Pada 4x panel samping disurutkan supaya
   gambarnya boleh memakai seluruh lebar jendela. */
/* Rantai ketukan pada layar tengah:
     video terjeda -> putar
     lalu           -> zoom 2x -> zoom 4x -> kembali normal -> zoom 2x ...
   Gambar diam tidak punya tahap "putar", jadi langsung masuk daur zoom. */
function putarZoom(){
  if(pjVideoAktif!==null && elVideoLayar.paused){ cobaPutar(); return; }
  zoomLayar=(zoomLayar+1)%3;
  Suara.sfx.klik();
  perbaruiTingkatZoom();
}
function perbaruiTingkatZoom(){
  document.body.classList.toggle('zoomPenuh', zoomLayar===2);
  elTayangLayar.classList.toggle('dekat', zoomLayar>0);
  elTayangLayar.classList.toggle('penuh', zoomLayar===2);
}
elTayangLayar.onclick=putarZoom;
const PJ_IKON=['kaki','punggung','lengan_dan_dada'];
const PJ_PETA=['kaki','punggung','lengan_dan_dada'];

function pjTayangkan(src, judul){
  pjHentikanVideo();
  const u=monitorRuang(layar);
  if(!u) return;
  tayangAktif={src,judul};
  gantiTekstur(u.layar, layarKosongGelap(judul));
  if(layar==='materi') mtSorotLayar();
  elGambarLayar.src=src;
  elGambarLayar.classList.add('main');
  elTayangLayar.classList.add('tampil');
  Suara.sfx.klik();
  pjRender();
}
function pjBersihkanTayangan(){
  pjTutupTayangan();
  if(!tayangAktif) return;
  const u=monitorRuang(layar);
  tayangAktif=null; zoomLayar=0; perbaruiTingkatZoom();
  pjLayarTopik(u);
  if(layar==='materi') mtSorotLayar();
}
function pjRender(){
  const area=PJ_AREA[pjTab], G=GALERI[area];
  const LK=LANGKAH_KERJA[area]||[];
  document.getElementById('pjTab').innerHTML=MASSAGE.map((x,i)=>{
    const g2=GALERI[PJ_AREA[i]];
    return `<button data-pj="${i}" class="${i===pjTab?'aktif':''}">
      ${ikonTab(PJ_IKON[i])}${g2.nama}<span>${LANGKAH_KERJA[PJ_AREA[i]].length} langkah · ${x.titik.length} titik</span>
      ${maju.massage&&maju.massage[PJ_AREA[i]]?'<span class="cek">✓</span>':''}</button>`;
  }).join('');
  document.querySelectorAll('#pjTab [data-pj]').forEach(b=>
    b.onclick=()=>{ const i=+b.dataset.pj; if(i===pjTab)return;
      Suara.sfx.klik(); pjTab=i; pjBersihkanTayangan(); pjRender(); });

  document.getElementById('pjIsi').innerHTML=
    `<div class="pjKartu"><h5>🎬 Langkah Kerja — Area ${G.nama} (${LK.length} langkah)</h5>
       <p style="margin-bottom:9px">Ketuk sebuah langkah untuk menampilkannya di
          layar tengah, lalu ketuk layarnya untuk memutar — ketukan berikutnya
          memperbesar 2×, lalu 4×, lalu kembali normal.</p>
       <div class="pjVideo">` +
        LK.map((v,i)=> v.f
          ? `<button data-video="${i}" class="${pjVideoAktif===i?'main':''}">
               <span class="sam"><img src="${v.s}" alt="" loading="lazy"></span>
               <span><b>${v.n}. ${v.j}</b><p>${v.d}</p>
                 <span class="durasi">${pjVideoAktif===i?'● tampil di layar tengah — ketuk layarnya untuk memutar':'▶ tayangkan di layar tengah'}</span>
               </span></button>`
          : `<div class="lkTanpa"><span class="sam nihil">${v.n}</span>
               <span><b>${v.j}</b><p>${v.d}</p></span></div>`).join('') +
       `</div>` +
       (pjVideoAktif!==null ? `<button class="tblAbu2" style="margin-top:9px" data-stop>⏹ Hentikan tayangan</button>` : '') +
     `</div>
     <div class="pjKartu"><h5>🗺️ Peta Titik — Area ${G.nama}</h5>
       <img src="assets/materi/4/${PJ_PETA[pjTab]}.png" alt="Peta titik area ${G.nama}"
            data-tayang="Peta titik — area ${G.nama}" style="max-height:340px">
       <div class="zoomKet">📺 ketuk gambar untuk menayangkannya di layar tengah,
            lalu ketuk layarnya untuk memperbesar 2×</div></div>`;
  document.getElementById('pjIsi').scrollTop=0;
  const wIsi=document.getElementById('pjIsi');
  wIsi.querySelectorAll('[data-video]').forEach(b=>b.onclick=()=>pjPutarVideo(+b.dataset.video));
  const bStop=wIsi.querySelector('[data-stop]');
  if(bStop) bStop.onclick=()=>{ Suara.sfx.tutup(); pjBersihkanTayangan(); pjRender(); };

  /* layar area terpilih menyala lebih terang; layar tengah tetap terang bila
     sedang menayangkan gambar pilihan pengguna */
  papanMassage.forEach((u,i)=>{
    const aktif = i===pjTab || (i===1 && tayangAktif);
    u.layar.material.emissiveIntensity = aktif ? 1.05 : .42;
    u.led.material.color.setHex(aktif ? 0x8dffc4 : 0x3a6b52);
  });
  if(!maju.massage) maju.massage={};
  if(!maju.massage[area]){ maju.massage[area]=true; simpanMaju(); }
}

function bukaPanel(i){
  const m=MENU[i];
  if(!menuTerbuka(m.no)){
    Suara.sfx.tutup();
    const sb=MENU[(maju.buka||1)-1];
    document.getElementById('panelIk').textContent='🔒';
    document.getElementById('panelSub').textContent='MENU '+m.no+' DARI '+MENU.length;
    document.getElementById('panelJudul').textContent=m.n;
    document.getElementById('panelIsi').innerHTML=
      `Tahap ini belum terbuka. Menu dibuka berurutan — lanjutkan dari
       <b>menu ${sb.no} — ${sb.n}</b>, lalu tahap sesudahnya terbuka sendiri.`;
    elPanel.classList.add('tampil');
    return;
  }
  catatMenuDibuka(m.no);
  if(m.ruang){ masukRuang(m.ruang); return; }
  Suara.sfx.buka();
  document.getElementById('panelIk').textContent=m.ik;
  document.getElementById('panelSub').textContent='MENU '+m.no+' DARI '+MENU.length;
  document.getElementById('panelJudul').textContent=m.n;
  document.getElementById('panelIsi').innerHTML=
    m.d+'<br><br><i style="color:#8d8073">Tahap ini akan dibuka pada pengembangan berikutnya.</i>';
  elPanel.classList.add('tampil');
}
document.getElementById('panelTutup').onclick=()=>{ Suara.sfx.tutup(); elPanel.classList.remove('tampil'); };
addEventListener('keydown',e=>{ if(e.key==='Escape') elPanel.classList.remove('tampil'); });

document.getElementById('btnMasuk').onclick=()=>{
  try{ Suara.init(); Suara.mulaiBgm(); Suara.sfx.buka(); }catch(e){}
  elPembuka.classList.remove('tampil');
  elTirai.style.transition='opacity .45s ease'; elTirai.style.opacity='1';
  setTimeout(()=>{
    keLayar('menu');
    elTirai.style.transition='opacity 1.2s ease'; elTirai.style.opacity='0';
    wadahHotspot.classList.add('hidup');
    elBar.classList.add('tampil'); elJudul.classList.add('tampil'); elPandu.classList.add('tampil');
  },460);
};
document.getElementById('btnKeluar').onclick=()=>{
  Suara.sfx.tutup();
  elPanel.classList.remove('tampil');
  elPengantar.classList.remove('tampil');
  elMateri.classList.remove('tampil');
  elSiap.classList.remove('tampil');
  elTutup.classList.remove('tampil');
  elHasil.classList.remove('tampil');
  elTes.classList.remove('tampil');
  elTesLayar.classList.remove('tampil');
  elPijat.classList.remove('tampil');
  document.getElementById('mZoom').classList.remove('tampil');
  document.getElementById('spPesan').classList.remove('tampil');
  document.body.classList.remove('di-ruang');
  wadahHotspot.classList.remove('hidup');
  elBar.classList.remove('tampil'); elJudul.classList.remove('tampil'); elPandu.classList.remove('tampil');
  if(sorotKini>=0){ sorot(sorotKini,false); sorotKini=-1; }
  keLayar('buka');
  setTimeout(()=>elPembuka.classList.add('tampil'),380);
};
document.getElementById('btnPandang').onclick=()=>{
  Suara.sfx.klik(); parallax.x=parallax.y=0;
  posKini.copy(PANDANG.menu.pos); lihatKini.copy(PANDANG.menu.lihat);
};
const btnMusik=document.getElementById('btnMusik');
btnMusik.onclick=()=>{
  const baru=!Suara.nyala(); Suara.setNyala(baru);
  btnMusik.textContent=baru?'🔊':'🔇'; btnMusik.classList.toggle('mati',!baru);
};

/* ---------- 10. GELUNG UTAMA ---------- */
const jam=new T.Clock();
let siap=false;
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(jam.getDelta(),.05), w=jam.elapsedTime;
  for(let i=0;i<animasi.length;i++) animasi[i](w,dt);
  perbaruiKamera(dt,w);
  if(siap){ periksaSorot(); perbaruiHotspot(); perbaruiTayangLayar(); }
  renderer.render(scene,camera);
}

/* Pemanasan: shader dikompilasi lebih dulu supaya frame pertama tidak tersendat. */
(function mulai(){
  let p=0;
  const tik=()=>{
    p=Math.min(100,p+ (p<70?14:6));
    elMuatBar.style.width=p+'%';
    if(p<100){ requestAnimationFrame(tik); return; }
    setTimeout(()=>{
      elMuat.classList.add('pergi');
      elTirai.style.opacity='0';
      siap=true;
      setTimeout(()=>{ elPembuka.classList.add('tampil'); elMuat.style.display='none'; },700);
    },160);
  };
  isiRakAlat();          /* dijalankan di sini agar seluruh data alat sudah ada */
  migrasiBukaMenu();     /* idem: menuTuntas(5) menyentuh afterTuntas() */
  perbaruiKunciMenu();
  renderer.compile(scene,camera);
  keLayar('buka');
  loop();
  requestAnimationFrame(tik);
})();

/* ---------- MENTOR TERAPIS DI RUANG PRAKTIK ----------
   Gambar mentor kini sosok utuh sampai kaki, jadi ia berdiri di lantai di
   samping meja perawatan — bukan lagi disembunyikan di baliknya seperti
   ketika gambarnya masih terpotong sebatas paha. */
taruhMentor(scene,{x:-2.15,z:-.35,emisi:.42});
